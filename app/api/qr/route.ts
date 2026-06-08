import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import redis, { REDIS_KEYS, QR_EXPIRY } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { class: cls, section, subject } = await req.json();
    if (!cls || !section || !subject) {
      return NextResponse.json({ error: 'Class, section, and subject required' }, { status: 400 });
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm');

    await prisma.classSession.updateMany({ where: { class: cls, section, active: true }, data: { active: false, endTime: now } });

    const qrToken = uuidv4();
    const session = await prisma.classSession.create({
      data: { class: cls, section, subject, date: today, startTime: now, createdBy: auth.email, qrToken, active: true },
    });

    const sessionData = JSON.stringify({ sessionId: session.id, class: cls, section, subject, date: today, createdBy: auth.email });
    await redis.setex(REDIS_KEYS.qrSession(qrToken), QR_EXPIRY, sessionData);
    await redis.setex(REDIS_KEYS.activeQR(`${cls}-${section}`), QR_EXPIRY + 5, qrToken);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qrUrl = `${appUrl}/scan?token=${qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2, color: { dark: '#1e3a5f', light: '#ffffff' } });

    return NextResponse.json({
      session: { id: session.id, _id: session.id, qrToken, class: cls, section, subject, date: today, startTime: now },
      qrDataUrl,
      qrUrl,
      expiresIn: QR_EXPIRY,
    });
  } catch (error) {
    console.error('QR generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    if (!cls || !section) return NextResponse.json({ error: 'Class and section required' }, { status: 400 });

    const token = await redis.get(REDIS_KEYS.activeQR(`${cls}-${section}`));
    if (!token) return NextResponse.json({ active: false });

    const ttl = await redis.ttl(REDIS_KEYS.qrSession(token));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qrUrl = `${appUrl}/scan?token=${token}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2, color: { dark: '#1e3a5f', light: '#ffffff' } });

    return NextResponse.json({ active: true, qrDataUrl, qrUrl, ttl, token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

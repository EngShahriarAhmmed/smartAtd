import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import redis, { REDIS_KEYS } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { sessionId, qrToken, class: cls, section, subject, period } = body;
    const now = new Date();

    if (sessionId) {
      await prisma.classSession.update({ where: { id: sessionId }, data: { active: false, endTime: format(now, 'HH:mm') } }).catch(() => null);
    }

    if (qrToken) await redis.del(REDIS_KEYS.qrSession(qrToken));
    if (cls && section) await redis.del(REDIS_KEYS.activeQR(`${cls}-${section}`));

    const log = await prisma.teacherClassLog.findFirst({
      where: { teacherEmail: auth.email, class: cls, section, subject: subject || '', period: period || '', date: format(now, 'yyyy-MM-dd') },
    });
    if (log) await prisma.teacherClassLog.update({ where: { id: log.id }, data: { endTime: now } });

    return NextResponse.json({ success: true, message: 'Session ended successfully' });
  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

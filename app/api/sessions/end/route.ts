import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ClassSession } from '@/models/ClassSession';
import { getAuthFromRequest } from '@/lib/auth';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { sessionId, qrToken, class: cls, section } = await req.json();

    const now = format(new Date(), 'HH:mm');
    await ClassSession.findByIdAndUpdate(sessionId, { active: false, endTime: now });

    if (qrToken) await redis.del(REDIS_KEYS.qrSession(qrToken));
    if (cls && section) await redis.del(REDIS_KEYS.activeQR(`${cls}-${section}`));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

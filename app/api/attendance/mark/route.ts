import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis, { REDIS_KEYS, RATE_LIMIT_WINDOW } from '@/lib/redis';
import { duplicateError, withMongoId } from '@/lib/prisma-utils';

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, studentQrToken } = await req.json();
    if (!sessionToken || !studentQrToken) {
      return NextResponse.json({ error: 'Session token and student QR token are required' }, { status: 400 });
    }

    const sessionData = await redis.get(REDIS_KEYS.qrSession(sessionToken));
    if (!sessionData) {
      return NextResponse.json({ error: 'QR code has expired. Please ask your teacher to refresh.' }, { status: 410 });
    }

    const session = JSON.parse(sessionData);
    const student = await prisma.student.findFirst({ where: { qrToken: studentQrToken, active: true } });
    if (!student) return NextResponse.json({ error: 'Invalid student QR code' }, { status: 404 });

    const rateLimitKey = REDIS_KEYS.attendanceRateLimit(student.id);
    const alreadyMarked = await redis.get(rateLimitKey);
    if (alreadyMarked) {
      return NextResponse.json({ error: 'Attendance already marked recently. Please wait before scanning again.', studentName: student.name }, { status: 429 });
    }

    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: session.date, class: student.class, section: student.section, subject: '', period: '' },
    });

    if (existing) {
      return NextResponse.json({ success: false, message: `Attendance already marked for ${student.name} on ${session.date}`, status: existing.status, studentName: student.name });
    }

    const [startH, startM] = session.startTime ? session.startTime.split(':').map(Number) : [0, 0];
    const now = new Date();
    const sessionStart = new Date();
    sessionStart.setHours(startH, startM, 0, 0);
    const diffMins = (now.getTime() - sessionStart.getTime()) / 60000;
    const status = diffMins > 15 ? 'late' : 'present';

    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        institutionId: student.institutionId,
        class: student.class,
        section: student.section,
        date: session.date,
        status,
        markedAt: now,
        markedBy: session.createdBy,
        sessionToken,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    await redis.setex(rateLimitKey, RATE_LIMIT_WINDOW, '1');
    await redis.del(REDIS_KEYS.dashboardCache(session.date));

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${student.name}`,
      studentName: student.name,
      studentId: student.studentId,
      class: student.class,
      section: student.section,
      status,
      date: session.date,
      attendanceId: attendance.id,
      attendance: withMongoId(attendance),
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate scan. Attendance already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

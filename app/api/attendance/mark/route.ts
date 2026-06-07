import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student } from '@/models/Student';
import { Attendance } from '@/models/Attendance';
import redis, { REDIS_KEYS, RATE_LIMIT_WINDOW } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, studentQrToken } = await req.json();
    if (!sessionToken || !studentQrToken) {
      return NextResponse.json({ error: 'Session token and student QR token are required' }, { status: 400 });
    }

    // Validate session token in Redis
    const sessionData = await redis.get(REDIS_KEYS.qrSession(sessionToken));
    if (!sessionData) {
      return NextResponse.json({ error: 'QR code has expired. Please ask your teacher to refresh.' }, { status: 410 });
    }

    const session = JSON.parse(sessionData);

    await connectDB();

    // Find student by QR token
    const student = await Student.findOne({ qrToken: studentQrToken, active: true });
    if (!student) {
      return NextResponse.json({ error: 'Invalid student QR code' }, { status: 404 });
    }

    // Rate limiting: prevent duplicate scans
    const rateLimitKey = REDIS_KEYS.attendanceRateLimit(student._id.toString());
    const alreadyMarked = await redis.get(rateLimitKey);
    if (alreadyMarked) {
      return NextResponse.json({
        error: 'Attendance already marked recently. Please wait before scanning again.',
        studentName: student.name,
      }, { status: 429 });
    }

    // Check if already marked today
    const existing = await Attendance.findOne({
      studentId: student._id,
      date: session.date,
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: `Attendance already marked for ${student.name} on ${session.date}`,
        status: existing.status,
        studentName: student.name,
      });
    }

    // Determine status (late if more than 15 mins after session start)
    const [startH, startM] = session.startTime ? session.startTime.split(':').map(Number) : [0, 0];
    const now = new Date();
    const sessionStart = new Date();
    sessionStart.setHours(startH, startM, 0, 0);
    const diffMins = (now.getTime() - sessionStart.getTime()) / 60000;
    const status = diffMins > 15 ? 'late' : 'present';

    // Create attendance record
    const attendance = await Attendance.create({
      studentId: student._id,
      class: student.class,
      section: student.section,
      date: session.date,
      status,
      markedAt: now,
      markedBy: session.createdBy,
      sessionToken,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    // Set rate limit
    await redis.setex(rateLimitKey, RATE_LIMIT_WINDOW, '1');

    // Invalidate dashboard cache
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
      attendanceId: attendance._id,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

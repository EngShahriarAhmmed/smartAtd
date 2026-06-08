import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { duplicateError, tenantWhere, withMongoId } from '@/lib/prisma-utils';
import redis, { REDIS_KEYS, RATE_LIMIT_WINDOW } from '@/lib/redis';
import { normalizeQrToken, readOpaqueQrToken } from '@/lib/qr-token';
import { createAuditLog } from '@/lib/audit';

function normalizePayload(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return {
      raw,
      token: parsed.token || parsed.qrToken || parsed.studentQrToken,
      studentId: parsed.studentId || parsed.roll || parsed.Roll,
      name: parsed.name || parsed.Name,
      class: parsed.class || parsed.Class,
      section: parsed.section || parsed.Section,
      rollNumber: parsed.rollNumber || parsed.roll || parsed.Roll,
    };
  } catch {
    const parts = raw.split('|').map((item) => item.trim());

    if (parts.length >= 5) {
      return {
        raw,
        name: parts[0],
        studentId: parts[1],
        rollNumber: parts[1],
        class: undefined,
        section: undefined,
        token: undefined,
      };
    }

    return { raw, token: raw };
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const rawQr = String(
      body.qrData || body.qrPayload || body.qrToken || body.token || ''
    ).trim();

    if (!rawQr && !body.studentId) {
      return NextResponse.json(
        { error: 'QR data or student ID is required' },
        { status: 400 }
      );
    }

    const parsed = normalizePayload(rawQr);

    const candidateToken =
      body.qrToken || body.token || parsed.token || normalizeQrToken(rawQr);

    const decryptedToken = candidateToken
      ? readOpaqueQrToken(String(candidateToken))
      : null;

    const finalToken = decryptedToken || candidateToken;

    const date = body.date || format(new Date(), 'yyyy-MM-dd');
    const cls = body.class || parsed.class;
    const section = body.section || parsed.section;
    const subject = body.subject || body.subjectName || '';
    const period = body.period || body.periodName || '';

    const studentOrConditions: Prisma.StudentWhereInput[] = [];

    if (finalToken) {
      studentOrConditions.push({
        qrToken: String(finalToken),
      });
    }

    if (body.studentId) {
      studentOrConditions.push({
        studentId: String(body.studentId),
      });
    }

    if (parsed.studentId) {
      studentOrConditions.push({
        studentId: String(parsed.studentId),
      });
    }

    if (studentOrConditions.length === 0) {
      return NextResponse.json(
        { error: 'QR token or student ID is required' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: {
        ...tenantWhere(auth),
        active: true,
        OR: studentOrConditions,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Invalid student QR code' },
        { status: 404 }
      );
    }

    if (cls && student.class !== cls) {
      return NextResponse.json(
        {
          error: `Wrong class. Student belongs to Class ${student.class}-${student.section}`,
        },
        { status: 409 }
      );
    }

    if (section && student.section !== section) {
      return NextResponse.json(
        {
          error: `Wrong section. Student belongs to Class ${student.class}-${student.section}`,
        },
        { status: 409 }
      );
    }

    const rateLimitKey = REDIS_KEYS.attendanceRateLimit(
      student.id,
      `${date}:${subject}:${period}`
    );

    const alreadyProcessing = await redis.get(rateLimitKey);

    if (alreadyProcessing) {
      return NextResponse.json(
        {
          error: 'Duplicate scan blocked. Scanner is ready for the next QR.',
          studentName: student.name,
        },
        { status: 429 }
      );
    }

    const attendanceWhere: Prisma.AttendanceWhereInput = {
      studentId: student.id,
      date,
      class: student.class,
      section: student.section,
      subject,
      period,
    };

    const existing = await prisma.attendance.findFirst({
      where: attendanceWhere,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Attendance already marked for this period',
          student: {
            id: student.id,
            _id: student.id,
            name: student.name,
            studentId: student.studentId,
            class: student.class,
            section: student.section,
          },
          record: withMongoId(existing),
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const status = body.status || 'present';

    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        date,
        class: student.class,
        section: student.section,
        subject,
        period,
        institutionId: student.institutionId,
        status,
        markedAt: now,
        scanTime: now,
        markedBy: auth.email,
        latitude: body.latitude,
        longitude: body.longitude,
        deviceId: body.deviceId || req.headers.get('user-agent') || undefined,
        ipAddress:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown',
        source: body.source || 'qr',
      },
    });

    const logWhere: Prisma.TeacherClassLogWhereInput = {
      teacherEmail: auth.email,
      class: student.class,
      section: student.section,
      subject,
      period,
      date,
    };

    const existingLog = await prisma.teacherClassLog.findFirst({
      where: logWhere,
    });

    if (existingLog) {
      await prisma.teacherClassLog.update({
        where: { id: existingLog.id },
        data: {
          scanCount: {
            increment: 1,
          },
        },
      });
    } else {
      await prisma.teacherClassLog.create({
        data: {
          institutionId: student.institutionId,
          teacherEmail: auth.email,
          class: student.class,
          section: student.section,
          subject,
          period,
          date,
          startTime: now,
          scanCount: 1,
        },
      });
    }

    await redis.setex(rateLimitKey, RATE_LIMIT_WINDOW, '1');

    await redis.del(REDIS_KEYS.dashboardCache(date));
    await redis.del(
      REDIS_KEYS.dashboardCache(`${date}-${student.class}-${student.section}`)
    );

    await createAuditLog({
      req,
      auth,
      action: 'attendance.scan',
      entity: 'Attendance',
      entityId: attendance.id,
      after: {
        studentId: student.studentId,
        date,
        subject,
        period,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${student.name}`,
      student: {
        id: student.id,
        _id: student.id,
        name: student.name,
        studentId: student.studentId,
        class: student.class,
        section: student.section,
      },
      record: withMongoId(attendance),
    });
  } catch (error: unknown) {
    console.error('Attendance scan error:', error);

    if (duplicateError(error)) {
      return NextResponse.json(
        { error: 'Duplicate scan. Attendance already exists.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
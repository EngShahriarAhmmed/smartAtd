import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { tenantWhere, withMongoId } from '@/lib/prisma-utils';
import redis, { REDIS_KEYS } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const studentId = searchParams.get('studentId');
    const subject = searchParams.get('subject');
    const period = searchParams.get('period');
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;

    if (date === format(new Date(), 'yyyy-MM-dd') && !studentId) {
      const cacheKey = REDIS_KEYS.dashboardCache(`${date}-${cls || 'all'}-${section || 'all'}-${subject || 'all'}-${period || 'all'}-${page}-${limit}`);
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(JSON.parse(cached));
    }

    const where = {
      ...tenantWhere(auth),
      date,
      ...(cls ? { class: cls } : {}),
      ...(section ? { section } : {}),
      ...(studentId ? { studentId } : {}),
      ...(subject ? { subject } : {}),
      ...(period ? { period } : {}),
    };

    const [attendanceRecords, totalRecords] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { markedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    const studentIds = Array.from(new Set(attendanceRecords.map((record) => record.studentId)));
    const students = studentIds.length
      ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];

    const studentMap = new Map(students.map((student) => [student.id, withMongoId(student)]));
    const records = attendanceRecords.map((record) => ({
      ...withMongoId(record),
      studentId: studentMap.get(record.studentId) || record.studentId,
    }));

    const studentWhere = {
      ...tenantWhere(auth),
      active: true,
      ...(cls ? { class: cls } : {}),
      ...(section ? { section } : {}),
    };
    const totalStudents = await prisma.student.count({ where: studentWhere });
    const result = { records, totalStudents, date, pagination: { page, limit, total: totalRecords, totalPages: Math.max(Math.ceil(totalRecords / limit), 1) } };

    if (date === format(new Date(), 'yyyy-MM-dd') && !studentId) {
      const cacheKey = REDIS_KEYS.dashboardCache(`${date}-${cls || 'all'}-${section || 'all'}-${subject || 'all'}-${period || 'all'}-${page}-${limit}`);
      await redis.setex(cacheKey, 30, JSON.stringify(result));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const today = format(new Date(), 'yyyy-MM-dd');
    const cacheKey = REDIS_KEYS.dashboardCache(`${auth.institutionId || 'global'}:${today}`);
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    const scoped = tenantWhere(auth);
    const [totalStudents, presentToday, lateToday, recentAttendanceRaw, sessions, classGroups] = await Promise.all([
      prisma.student.count({ where: { ...scoped, active: true } }),
      prisma.attendance.count({ where: { ...scoped, date: today, status: 'present' } }),
      prisma.attendance.count({ where: { ...scoped, date: today, status: 'late' } }),
      prisma.attendance.findMany({ where: { ...scoped, date: today }, orderBy: { markedAt: 'desc' }, take: 10 }),
      prisma.classSession.findMany({ where: { date: today, active: true } }),
      prisma.student.groupBy({ by: ['class', 'section'], where: { ...scoped, active: true }, _count: { _all: true } }),
    ]);

    const recentStudentIds = Array.from(new Set(recentAttendanceRaw.map((item) => item.studentId)));
    const recentStudents = recentStudentIds.length ? await prisma.student.findMany({ where: { id: { in: recentStudentIds } } }) : [];
    const recentMap = new Map(recentStudents.map((student) => [student.id, withMongoId(student)]));
    const recentAttendance = recentAttendanceRaw.map((record) => ({ ...withMongoId(record), studentId: recentMap.get(record.studentId) || record.studentId }));

    const classStats = await Promise.all(
      classGroups.map(async (group) => {
        const present = await prisma.attendance.count({
          where: {
            ...scoped,
            class: group.class,
            section: group.section,
            date: today,
            status: { in: ['present', 'late'] },
          },
        });
        return { class: `${group.class}-${group.section}`, present, total: group._count._all };
      })
    );

    const stats = {
      totalStudents,
      presentToday: presentToday + lateToday,
      lateToday,
      absentToday: Math.max(totalStudents - presentToday - lateToday, 0),
      attendanceRate: totalStudents > 0 ? Math.round(((presentToday + lateToday) / totalStudents) * 100) : 0,
      recentAttendance,
      classStats,
      activeSessions: sessions.length,
      date: today,
    };

    await redis.setex(cacheKey, 30, JSON.stringify(stats));
    return NextResponse.json(stats);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

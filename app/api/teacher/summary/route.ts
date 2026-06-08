import { format } from 'date-fns';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'teacher') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = format(new Date(), 'yyyy-MM-dd');
    const teacher = await prisma.teacher.findFirst({ where: { userId: auth.userId } });
    const logs = await prisma.teacherClassLog.findMany({ where: { teacherEmail: auth.email }, orderBy: { startTime: 'desc' }, take: 100 });
    const todayLogs = logs.filter((log) => log.date === today);
    const attendance = await prisma.attendance.findMany({ where: { markedBy: auth.email }, orderBy: { markedAt: 'desc' }, take: 100 });
    const subjects = Array.from(new Set(logs.map((log) => log.subject).filter(Boolean)));
    const classes = Array.from(new Set(logs.map((log) => `${log.class}-${log.section}`)));

    return NextResponse.json({
      teacher: teacher ? { ...teacher, _id: teacher.id } : null,
      summary: {
        todayClasses: todayLogs.length,
        attendanceTaken: todayLogs.reduce((sum, log) => sum + log.scanCount, 0),
        totalSessions: logs.length,
        subjectCount: subjects.length,
        classCount: classes.length,
      },
      logs: logs.map((log) => ({ ...log, _id: log.id })),
      attendance: attendance.map((record) => ({ ...record, _id: record.id })),
    });
  } catch (error) {
    console.error('Teacher summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

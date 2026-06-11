import { format, startOfMonth } from 'date-fns';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { withMongoId } from '@/lib/prisma-utils';

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function normalize(value?: string | null) {
  return (value || '').trim();
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const dayName = format(now, 'EEEE');

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { userId: auth.userId },
          { email: auth.email },
        ],
        deletedAt: null,
      },
    });

    const logWhere = {
      institutionId: auth.institutionId,
      teacherEmail: auth.email,
      deletedAt: null,
    };

    const attendanceWhere = {
      institutionId: auth.institutionId,
      markedBy: auth.email,
      deletedAt: null,
    };

    const [logs, todayLogs, monthLogs, attendance, todayAttendance, monthAttendance, routines] = await Promise.all([
      prisma.teacherClassLog.findMany({
        where: logWhere,
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
        take: 300,
      }),
      prisma.teacherClassLog.findMany({
        where: { ...logWhere, date: today },
        orderBy: { startTime: 'desc' },
      }),
      prisma.teacherClassLog.findMany({
        where: { ...logWhere, date: { gte: monthStart, lte: today } },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
        take: 500,
      }),
      prisma.attendance.findMany({
        where: attendanceWhere,
        orderBy: { markedAt: 'desc' },
        take: 200,
      }),
      prisma.attendance.findMany({
        where: { ...attendanceWhere, date: today },
        orderBy: { markedAt: 'desc' },
        take: 300,
      }),
      prisma.attendance.findMany({
        where: { ...attendanceWhere, date: { gte: monthStart, lte: today } },
        orderBy: { markedAt: 'desc' },
        take: 1000,
      }),
      teacher?.id
        ? prisma.routine.findMany({
            where: {
              institutionId: auth.institutionId,
              teacherId: teacher.id,
              day: dayName,
              active: true,
              deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const classSectionPairs = Array.from(new Set(logs.map((log) => `${normalize(log.class)}-${normalize(log.section)}`).filter((v) => v !== '-')));
    const subjects = Array.from(new Set(logs.map((log) => normalize(log.subject)).filter(Boolean)));
    const periods = Array.from(new Set(logs.map((log) => normalize(log.period)).filter(Boolean)));
    const todayStudents = Array.from(new Set(todayAttendance.map((record) => record.studentId)));
    const monthStudents = Array.from(new Set(monthAttendance.map((record) => record.studentId)));

    const todaySessionKeys = new Set(
      todayLogs.map((log) => `${normalize(log.class)}|${normalize(log.section)}|${normalize(log.subject)}|${normalize(log.period)}`),
    );

    const routineIds = {
      classIds: Array.from(new Set(routines.map((routine) => routine.classId).filter(Boolean))) as string[],
      sectionIds: Array.from(new Set(routines.map((routine) => routine.sectionId).filter(Boolean))) as string[],
      subjectIds: Array.from(new Set(routines.map((routine) => routine.subjectId).filter(Boolean))) as string[],
      periodIds: Array.from(new Set(routines.map((routine) => routine.periodId).filter(Boolean))) as string[],
    };

    const [routineClasses, routineSections, routineSubjects, routinePeriods] = await Promise.all([
      routineIds.classIds.length ? prisma.class.findMany({ where: { id: { in: routineIds.classIds } } }) : Promise.resolve([]),
      routineIds.sectionIds.length ? prisma.section.findMany({ where: { id: { in: routineIds.sectionIds } } }) : Promise.resolve([]),
      routineIds.subjectIds.length ? prisma.subject.findMany({ where: { id: { in: routineIds.subjectIds } } }) : Promise.resolve([]),
      routineIds.periodIds.length ? prisma.period.findMany({ where: { id: { in: routineIds.periodIds } } }) : Promise.resolve([]),
    ]);

    const classMap = new Map(routineClasses.map((item) => [item.id, item.name]));
    const sectionMap = new Map(routineSections.map((item) => [item.id, item.name]));
    const subjectMap = new Map(routineSubjects.map((item) => [item.id, item.name]));
    const periodMap = new Map(routinePeriods.map((item) => [item.id, item.periodName]));

    const todaySchedule = routines.map((routine) => {
      const cls = routine.classId ? classMap.get(routine.classId) || '' : '';
      const section = routine.sectionId ? sectionMap.get(routine.sectionId) || '' : '';
      const subject = routine.subjectId ? subjectMap.get(routine.subjectId) || '' : '';
      const period = routine.periodId ? periodMap.get(routine.periodId) || '' : '';
      const key = `${normalize(cls)}|${normalize(section)}|${normalize(subject)}|${normalize(period)}`;
      return {
        ...withMongoId(routine),
        class: cls,
        section,
        subject,
        period,
        completed: todaySessionKeys.has(key),
      };
    });

    const scheduledClasses = todaySchedule.length;
    const completedScheduled = todaySchedule.filter((item) => item.completed).length;
    const pendingScheduled = Math.max(scheduledClasses - completedScheduled, 0);
    const totalClassScansToday = todayLogs.reduce((sum, log) => sum + (log.scanCount || 0), 0);
    const monthClassScans = monthLogs.reduce((sum, log) => sum + (log.scanCount || 0), 0);

    const activeClassPairs = Array.from(new Set(todayLogs.map((log) => `${log.class}|${log.section}`)));
    const studentCounts = activeClassPairs.length
      ? await Promise.all(
          activeClassPairs.map(async (pair) => {
            const [cls, section] = pair.split('|');
            return prisma.student.count({
              where: {
                institutionId: auth.institutionId,
                class: cls,
                section,
                active: true,
                deletedAt: null,
              },
            });
          }),
        )
      : [];

    const possibleTodayAttendance = studentCounts.reduce((sum, count) => sum + count, 0);
    const todayAttendanceRate = pct(todayStudents.length, possibleTodayAttendance);

    const lastLog = logs[0] || null;
    const lastAttendance = attendance[0] || null;

    return NextResponse.json({
      teacher: teacher ? withMongoId(teacher) : null,
      date: today,
      dayName,
      summary: {
        todayClasses: todayLogs.length,
        scheduledClasses,
        completedScheduled,
        pendingScheduled,
        attendanceTaken: totalClassScansToday,
        todayUniqueStudents: todayStudents.length,
        monthUniqueStudents: monthStudents.length,
        monthAttendanceTaken: monthAttendance.length,
        monthClassScans,
        totalSessions: logs.length,
        subjectCount: subjects.length,
        classCount: classSectionPairs.length,
        periodCount: periods.length,
        todayAttendanceRate,
        possibleTodayAttendance,
        recentAttendanceCount: attendance.length,
      },
      lists: {
        subjects,
        classes: classSectionPairs,
        periods,
      },
      todaySchedule,
      logs: logs.map(withMongoId),
      todayLogs: todayLogs.map(withMongoId),
      recentLogs: logs.slice(0, 8).map(withMongoId),
      attendance: attendance.map(withMongoId),
      recentAttendance: attendance.slice(0, 8).map(withMongoId),
      lastActivity: {
        classLog: lastLog ? withMongoId(lastLog) : null,
        attendance: lastAttendance ? withMongoId(lastAttendance) : null,
      },
    });
  } catch (error) {
    console.error('Teacher summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

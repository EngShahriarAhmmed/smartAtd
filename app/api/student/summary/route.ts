import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

function riskLevel(percentage: number) {
  if (percentage > 85) return 'Green';
  if (percentage >= 75) return 'Yellow';
  return 'Red';
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const student = await prisma.student.findFirst({ where: { userId: auth.userId, active: true } });
    if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { markedAt: 'desc' },
      take: 200,
    });

    const classHeld = await prisma.attendance.findMany({
      where: { institutionId: student.institutionId, class: student.class, section: student.section },
      select: { date: true, subject: true, period: true },
    });

    const uniqueHeld = new Set(classHeld.map((item) => `${item.date}|${item.subject}|${item.period}`));
    const attended = records.filter((item) => item.status === 'present' || item.status === 'late').length;
    const totalHeld = Math.max(uniqueHeld.size, attended);
    const percentage = totalHeld ? Math.round((attended / totalHeld) * 100) : 0;

    const subjectMap = new Map<string, { subject: string; attended: number; total: number }>();
    for (const held of uniqueHeld) {
      const [, subject] = held.split('|');
      const key = subject || 'General';
      const current = subjectMap.get(key) || { subject: key, attended: 0, total: 0 };
      current.total += 1;
      subjectMap.set(key, current);
    }
    for (const record of records) {
      if (record.status !== 'present' && record.status !== 'late') continue;
      const key = record.subject || 'General';
      const current = subjectMap.get(key) || { subject: key, attended: 0, total: 0 };
      current.attended += 1;
      subjectMap.set(key, current);
    }

    const subjects = Array.from(subjectMap.values()).map((item) => ({
      ...item,
      percentage: item.total ? Math.round((item.attended / item.total) * 100) : 0,
      riskLevel: riskLevel(item.total ? Math.round((item.attended / item.total) * 100) : 0),
    }));

    return NextResponse.json({
      student: { ...student, _id: student.id },
      summary: { attended, totalHeld, percentage, riskLevel: riskLevel(percentage), absences: Math.max(totalHeld - attended, 0) },
      subjects,
      records: records.map((item) => ({ ...item, _id: item.id })),
    });
  } catch (error) {
    console.error('Student summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

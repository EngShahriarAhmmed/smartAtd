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
    if (!auth || auth.role !== 'parent') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const children = await prisma.student.findMany({ where: { guardianUserId: auth.userId, active: true }, orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }] });

    const items = await Promise.all(children.map(async (student) => {
      const records = await prisma.attendance.findMany({ where: { studentId: student.id }, orderBy: { markedAt: 'desc' }, take: 50 });
      const classHeld = await prisma.attendance.findMany({ where: { institutionId: student.institutionId, class: student.class, section: student.section }, select: { date: true, subject: true, period: true } });
      const totalHeld = Math.max(new Set(classHeld.map((item) => `${item.date}|${item.subject}|${item.period}`)).size, records.length);
      const attended = records.filter((record) => record.status === 'present' || record.status === 'late').length;
      const percentage = totalHeld ? Math.round((attended / totalHeld) * 100) : 0;
      const absences = Math.max(totalHeld - attended, 0);
      const alerts = [
        ...(percentage < 75 ? [`Non-collegiate risk: attendance is ${percentage}%`] : []),
        ...(absences > 0 ? [`${absences} absence(s) recorded`] : []),
      ];
      return {
        student: { ...student, _id: student.id },
        summary: { attended, totalHeld, percentage, absences, riskLevel: riskLevel(percentage) },
        records: records.map((record) => ({ ...record, _id: record.id })),
        alerts,
      };
    }));

    return NextResponse.json({ children: items });
  } catch (error) {
    console.error('Parent children error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

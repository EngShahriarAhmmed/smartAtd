import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { attendanceRiskLevel, isNonCollegiate } from '@/lib/reporting';
import { tenantWhere } from '@/lib/prisma-utils';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const threshold = Number(searchParams.get('threshold') || process.env.NON_COLLEGIATE_THRESHOLD || 75);

    const students = await prisma.student.findMany({
      where: { ...tenantWhere(auth), active: true, ...(cls ? { class: cls } : {}), ...(section ? { section } : {}) },
      orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
    });

    const dateFilter = from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

    const results = await Promise.all(
      students.map(async (student) => {
        const attended = await prisma.attendance.count({ where: { studentId: student.id, status: { in: ['present', 'late'] }, ...dateFilter } });
        const totalHeld = Math.max(await prisma.attendance.count({ where: { ...tenantWhere(auth), class: student.class, section: student.section, ...dateFilter } }), attended);
        const percentage = totalHeld > 0 ? Math.round((attended / totalHeld) * 100) : 0;
        return {
          studentId: student.studentId,
          name: student.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          guardianPhone: student.guardianPhone,
          attended,
          totalHeld,
          percentage,
          riskLevel: attendanceRiskLevel(percentage),
          nonCollegiate: isNonCollegiate(percentage) || percentage < threshold,
        };
      })
    );

    return NextResponse.json({ threshold, students: results.filter((item) => item.nonCollegiate), all: results });
  } catch (error) {
    console.error('Non collegiate report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const [institutions, activeInstitutions, users, students, teachers, attendance, pendingNotifications, activePlans, platformSettings] = await Promise.all([
      prisma.institution.count(),
      prisma.institution.count({ where: { status: 'active' } }),
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.attendance.count(),
      prisma.notification.count({ where: { status: 'pending' } }),
      prisma.subscriptionPlan.count({ where: { status: 'active' } }),
      prisma.platformSetting.count({ where: { status: 'active' } }),
    ]);
    return NextResponse.json({ institutions, activeInstitutions, users, students, teachers, attendance, pendingNotifications, activePlans, platformSettings });
  } catch (error) {
    console.error('Overview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

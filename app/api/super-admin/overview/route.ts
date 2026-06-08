import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const [institutions, users, students, teachers, attendance, notifications] = await Promise.all([
      prisma.institution.count(),
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.attendance.count(),
      prisma.notification.count({ where: { status: 'pending' } }),
    ]);
    return NextResponse.json({ institutions, users, students, teachers, attendance, pendingNotifications: notifications });
  } catch (error) {
    console.error('Overview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

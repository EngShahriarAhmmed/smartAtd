import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import { tenantWhere } from '@/lib/prisma-utils';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const cls = searchParams.get('class');
    const section = searchParams.get('section');

    const logs = await prisma.teacherClassLog.findMany({
      where: {
        ...tenantWhere(auth),
        ...(auth.role === 'teacher' ? { teacherEmail: auth.email } : {}),
        ...(date ? { date } : {}),
        ...(cls ? { class: cls } : {}),
        ...(section ? { section } : {}),
      },
      orderBy: { startTime: 'desc' },
      take: 200,
    });

    const sessions = await prisma.classSession.findMany({
      where: { ...(date ? { date } : {}), ...(cls ? { class: cls } : {}), ...(section ? { section } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      logs: logs.map((item) => ({ ...item, _id: item.id })),
      sessions: sessions.map((item) => ({ ...item, _id: item.id })),
    });
  } catch (error) {
    console.error('Sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

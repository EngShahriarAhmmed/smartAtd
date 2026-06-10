import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { tenantWhere, withMongoIds } from '@/lib/prisma-utils';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const actorEmail = searchParams.get('actorEmail');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const logs = await prisma.auditLog.findMany({
      where: {
        ...tenantWhere(auth),
        ...(action ? { action: { contains: action } } : {}),
        ...(entity ? { entity: { contains: entity } } : {}),
        ...(actorEmail ? { actorEmail: { contains: actorEmail } } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(searchParams.get('limit') || 200),
    });

    return NextResponse.json({ logs: withMongoIds(logs) });
  } catch (error) {
    console.error('Audit log list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

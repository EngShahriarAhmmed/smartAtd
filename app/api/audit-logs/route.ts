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
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...tenantWhere(auth),
      ...(action ? { action: { contains: action } } : {}),
      ...(entity ? { entity: { contains: entity } } : {}),
      ...(actorEmail ? { actorEmail: { contains: actorEmail } } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs: withMongoIds(logs), pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error('Audit log list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

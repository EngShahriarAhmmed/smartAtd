import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deletionScope, duplicateError, tenantWhere, withMongoId, withMongoIds } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const deleted = searchParams.get('deleted') === 'true';
    const where = { ...tenantWhere(auth), ...deletionScope(deleted), ...(active === 'true' ? { active: true } : {}), ...(active === 'false' ? { active: false } : {}) };
    const items = await prisma.period.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ items: withMongoIds(items) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { periodName, startTime, endTime, active = true } = await req.json();
    if (!periodName || !startTime || !endTime) return NextResponse.json({ error: 'Period name, start time and end time are required' }, { status: 400 });
    const item = await prisma.period.create({ data: { periodName, startTime, endTime, active: typeof active === 'boolean' ? active : String(active) !== 'false', institutionId: auth.institutionId } });
    return NextResponse.json({ item: withMongoId(item) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate record' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

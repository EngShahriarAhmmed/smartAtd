import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deletionScope, notDeletedWhere, tenantWhere, withMongoId, withMongoIds } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const deleted = searchParams.get('deleted') === 'true';
    const where = { ...tenantWhere(auth), ...deletionScope(deleted), ...(active === 'true' ? { active: true } : {}), ...(active === 'false' ? { active: false } : {}) };
    const items = await prisma.section.findMany({ where, orderBy: { name: 'asc' } });
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

    const { name, active = true } = await req.json();
    const sectionName = String(name || '').trim();
    if (!sectionName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const duplicate = await prisma.section.findFirst({
      where: { ...tenantWhere(auth), ...notDeletedWhere(), name: sectionName },
    });
    if (duplicate) return NextResponse.json({ error: 'Section name already exists' }, { status: 409 });

    const item = await prisma.section.create({
      data: {
        name: sectionName,
        classId: null,
        className: null,
        active: typeof active === 'boolean' ? active : String(active) !== 'false',
        institutionId: auth.institutionId,
      },
    });

    return NextResponse.json({ item: withMongoId(item) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

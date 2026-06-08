import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { duplicateError, tenantWhere, withMongoId, withMongoIds } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const where = { ...tenantWhere(auth), ...(active === 'true' ? { active: true } : {}), ...(active === 'false' ? { active: false } : {}) };
    const items = await prisma.section.findMany({ where, orderBy: [{ className: 'asc' }, { name: 'asc' }] });
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

    const { name, classId, className, active = true } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const existing = await prisma.section.findFirst({
      where: { institutionId: auth.institutionId, classId: classId || null, name },
    });

    const item = existing
      ? await prisma.section.update({ where: { id: existing.id }, data: { className, active } })
      : await prisma.section.create({ data: { name, classId: classId || undefined, className, active, institutionId: auth.institutionId } });

    return NextResponse.json({ item: withMongoId(item) }, { status: existing ? 200 : 201 });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate record' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

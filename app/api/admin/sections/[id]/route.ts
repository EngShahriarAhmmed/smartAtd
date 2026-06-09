import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notDeletedWhere, restoreData, safeDeleteData, tenantWhere, withMongoId } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

async function findScopedSection(id: string, auth: NonNullable<ReturnType<typeof requireAuth>['auth']>) {
  return prisma.section.findFirst({ where: { id, ...tenantWhere(auth) } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const item = await findScopedSection(id, auth);
    if (!item) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json({ item: withMongoId(item) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await findScopedSection(id, auth);
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    const { name, active } = await req.json();
    const sectionName = String(name || '').trim();
    if (!sectionName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const duplicate = await prisma.section.findFirst({
      where: { ...tenantWhere(auth), ...notDeletedWhere(), name: sectionName, id: { not: id } },
    });
    if (duplicate) return NextResponse.json({ error: 'Section name already exists' }, { status: 409 });

    const item = await prisma.section.update({
      where: { id },
      data: { name: sectionName, classId: null, className: null, active: typeof active === 'boolean' ? active : String(active) === 'true' },
    });
    return NextResponse.json({ item: withMongoId(item) });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await findScopedSection(id, auth);
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.restore) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

    const duplicate = await prisma.section.findFirst({
      where: { ...tenantWhere(auth), ...notDeletedWhere(), name: existing.name, id: { not: id } },
    });
    if (duplicate) return NextResponse.json({ error: 'Another active section with this name already exists.' }, { status: 409 });

    const item = await prisma.section.update({ where: { id }, data: restoreData({ active: true, classId: null, className: null }) });
    return NextResponse.json({ item: withMongoId(item), message: 'Section restored successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await findScopedSection(id, auth);
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this record before permanent delete.' }, { status: 400 });
      await prisma.section.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Section permanently deleted.' });
    }

    await prisma.section.update({ where: { id }, data: safeDeleteData(auth, { active: false }) });
    return NextResponse.json({ success: true, message: 'Section moved to deleted records.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

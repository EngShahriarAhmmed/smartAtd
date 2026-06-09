import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { duplicateError, restoreData, safeDeleteData, tenantWhere, withMongoId } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

async function findScopedClass(id: string, auth: NonNullable<ReturnType<typeof requireAuth>['auth']>) {
  return prisma.class.findFirst({ where: { id, ...tenantWhere(auth) } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const item = await findScopedClass(id, auth);
    if (!item) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
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
    const existing = await findScopedClass(id, auth);
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const { name, code, active } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const item = await prisma.class.update({
      where: { id },
      data: { name, code: code || null, active: typeof active === 'boolean' ? active : String(active) === 'true' },
    });
    return NextResponse.json({ item: withMongoId(item) });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate record' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await findScopedClass(id, auth);
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.restore) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

    const item = await prisma.class.update({ where: { id }, data: restoreData({ active: true }) });
    return NextResponse.json({ item: withMongoId(item), message: 'Class restored successfully.' });
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
    const existing = await findScopedClass(id, auth);
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this record before permanent delete.' }, { status: 400 });
      await prisma.class.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Class permanently deleted.' });
    }

    await prisma.class.update({ where: { id }, data: safeDeleteData(auth, { active: false }) });
    return NextResponse.json({ success: true, message: 'Class moved to deleted records.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

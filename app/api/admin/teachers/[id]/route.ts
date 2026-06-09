import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { duplicateError, restoreData, safeDeleteData, tenantWhere, withMongoId } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

async function findScopedTeacher(id: string, auth: NonNullable<ReturnType<typeof requireAuth>['auth']>) {
  return prisma.teacher.findFirst({ where: { id, ...tenantWhere(auth) } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const item = await findScopedTeacher(id, auth);
    if (!item) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
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
    const existing = await findScopedTeacher(id, auth);
    if (!existing) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    const { employeeId, name, designation, department, photo, phone, email, active } = await req.json();
    if (!employeeId || !name) return NextResponse.json({ error: 'Employee ID and name are required' }, { status: 400 });

    const item = await prisma.teacher.update({
      where: { id },
      data: { employeeId, name, designation: designation || null, department: department || null, photo: photo || null, phone: phone || null, email: email ? String(email).toLowerCase() : null, active: typeof active === 'boolean' ? active : String(active) === 'true' },
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
    const existing = await findScopedTeacher(id, auth);
    if (!existing) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.restore) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

    const item = await prisma.teacher.update({ where: { id }, data: restoreData({ active: true }) });
    return NextResponse.json({ item: withMongoId(item), message: 'Teacher restored successfully.' });
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
    const existing = await findScopedTeacher(id, auth);
    if (!existing) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this record before permanent delete.' }, { status: 400 });
      await prisma.teacher.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Teacher permanently deleted.' });
    }

    await prisma.teacher.update({ where: { id }, data: safeDeleteData(auth, { active: false }) });
    return NextResponse.json({ success: true, message: 'Teacher moved to deleted records.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

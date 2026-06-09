import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { duplicateError, restoreData, safeDeleteData, tenantWhere, withMongoId } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

async function findScopedPeriod(id: string, auth: NonNullable<ReturnType<typeof requireAuth>['auth']>) {
  return prisma.period.findFirst({ where: { id, ...tenantWhere(auth) } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { id } = await params;
    const item = await findScopedPeriod(id, auth);
    if (!item) return NextResponse.json({ error: 'Period not found' }, { status: 404 });
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
    const existing = await findScopedPeriod(id, auth);
    if (!existing) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

    const { periodName, startTime, endTime, active } = await req.json();
    if (!periodName || !startTime || !endTime) return NextResponse.json({ error: 'Period name, start time and end time are required' }, { status: 400 });

    const item = await prisma.period.update({
      where: { id },
      data: { periodName, startTime, endTime, active: typeof active === 'boolean' ? active : String(active) === 'true' },
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
    const existing = await findScopedPeriod(id, auth);
    if (!existing) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.restore) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

    const item = await prisma.period.update({ where: { id }, data: restoreData({ active: true }) });
    return NextResponse.json({ item: withMongoId(item), message: 'Period restored successfully.' });
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
    const existing = await findScopedPeriod(id, auth);
    if (!existing) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this record before permanent delete.' }, { status: 400 });
      await prisma.period.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Period permanently deleted.' });
    }

    await prisma.period.update({ where: { id }, data: safeDeleteData(auth, { active: false }) });
    return NextResponse.json({ success: true, message: 'Period moved to deleted records.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

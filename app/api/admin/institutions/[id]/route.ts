import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { duplicateError, restoreData, safeDeleteData, withMongoId } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import type { ActiveStatus } from '@prisma/client';

const allowedStatuses = new Set<ActiveStatus>(['active', 'inactive', 'suspended']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const item = await prisma.institution.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    return NextResponse.json({ item: withMongoId(item) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await prisma.institution.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });

    const { name, code, address, logo, status = existing.status } = await req.json();
    if (!name || !code) return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    if (!allowedStatuses.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const item = await prisma.institution.update({
      where: { id },
      data: { name, code: String(code).toUpperCase(), address: address || null, logo: logo || null, status },
    });
    return NextResponse.json({ item: withMongoId(item) });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate institution code' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await prisma.institution.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    if (!body.restore) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

    const item = await prisma.institution.update({ where: { id }, data: restoreData({ status: 'active' }) });
    return NextResponse.json({ item: withMongoId(item), message: 'Institution restored successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await prisma.institution.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this record before permanent delete.' }, { status: 400 });
      await prisma.institution.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Institution permanently deleted.' });
    }

    await prisma.institution.update({ where: { id }, data: safeDeleteData(auth, { status: 'inactive' }) });
    return NextResponse.json({ success: true, message: 'Institution moved to deleted records.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

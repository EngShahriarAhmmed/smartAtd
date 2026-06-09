import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deletionScope, duplicateError, withMongoId, withMongoIds } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import type { ActiveStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const deleted = searchParams.get('deleted') === 'true';
    const where = {
      ...deletionScope(deleted),
      ...(active === 'true' ? { status: 'active' as ActiveStatus } : {}),
      ...(active === 'false' ? { status: { not: 'active' as ActiveStatus } } : {}),
    };
    const items = await prisma.institution.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ items: withMongoIds(items) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;

    const { name, code, address, logo, status = 'active' } = await req.json();
    if (!name || !code) return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    const item = await prisma.institution.create({ data: { name, code: String(code).toUpperCase(), address, logo, status } });
    return NextResponse.json({ item: withMongoId(item) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate record' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

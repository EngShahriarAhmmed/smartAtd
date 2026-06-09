import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deletionScope, duplicateError, withMongoId, withMongoIds } from '@/lib/prisma-utils';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import type { ActiveStatus } from '@prisma/client';

const statuses = new Set<ActiveStatus>(['active', 'inactive', 'suspended']);

export async function GET(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const deleted = new URL(req.url).searchParams.get('deleted') === 'true';
    const items = await prisma.platformSetting.findMany({ where: deletionScope(deleted), orderBy: [{ category: 'asc' }, { key: 'asc' }] });
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
    const { category, key, value, notes, status = 'active' } = await req.json();
    if (!category || !key || value === undefined) return NextResponse.json({ error: 'Category, key and value are required' }, { status: 400 });
    if (!statuses.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const item = await prisma.platformSetting.create({ data: { category, key, value: String(value), notes: notes || null, status } });
    return NextResponse.json({ item: withMongoId(item) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate setting key in this category' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

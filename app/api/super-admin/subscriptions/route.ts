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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ActiveStatus | null;
    const deleted = searchParams.get('deleted') === 'true';
    const where = { ...deletionScope(deleted), ...(status && statuses.has(status) ? { status } : {}) };
    const items = await prisma.subscriptionPlan.findMany({ where, orderBy: { createdAt: 'desc' } });
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
    const { name, price, studentLimit, features, status = 'active' } = await req.json();
    if (!name || !price) return NextResponse.json({ error: 'Plan name and price are required' }, { status: 400 });
    if (!statuses.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const item = await prisma.subscriptionPlan.create({
      data: { name, price, studentLimit: studentLimit ? Number(studentLimit) : null, features: features || null, status },
    });
    return NextResponse.json({ item: withMongoId(item) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Duplicate subscription plan' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

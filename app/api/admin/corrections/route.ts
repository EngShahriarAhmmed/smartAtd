import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import { tenantWhere } from '@/lib/prisma-utils';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const items = await prisma.attendanceCorrection.findMany({
      where: { ...tenantWhere(auth), ...(status ? { status: status as never } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ items: items.map((item) => ({ ...item, _id: item.id })) });
  } catch (error) {
    console.error('Corrections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

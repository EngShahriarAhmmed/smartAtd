import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { tenantWhere } from '@/lib/prisma-utils';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Student IDs are required' }, { status: 400 });
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: ids }, ...tenantWhere(auth) },
      data: { active: false },
    });

    return NextResponse.json({
      message: 'Selected students removed successfully',
      removedCount: result.count,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import { notDeletedWhere, tenantWhere, withMongoIds } from '@/lib/prisma-utils';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const where = {
      ...tenantWhere(auth),
      ...notDeletedWhere(),
      active: true,
    };

    const [classes, sections, subjects, periods] = await Promise.all([
      prisma.class.findMany({ where, orderBy: { name: 'asc' } }),
      prisma.section.findMany({ where, orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ where, orderBy: { name: 'asc' } }),
      prisma.period.findMany({ where, orderBy: { startTime: 'asc' } }),
    ]);

    return NextResponse.json({
      classes: withMongoIds(classes),
      sections: withMongoIds(sections),
      subjects: withMongoIds(subjects),
      periods: withMongoIds(periods),
    });
  } catch (error) {
    console.error('Master options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

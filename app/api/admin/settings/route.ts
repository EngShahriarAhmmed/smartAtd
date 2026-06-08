import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;
    const institution = auth.institutionId ? await prisma.institution.findUnique({ where: { id: auth.institutionId } }) : null;
    return NextResponse.json({ institution: institution ? { ...institution, _id: institution.id } : null });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

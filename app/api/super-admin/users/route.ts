import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import { deletionScope, duplicateError } from '@/lib/prisma-utils';
import type { UserRole } from '@prisma/client';

const allowedRoles = new Set<UserRole>(['super_admin', 'institution_admin', 'admin', 'teacher', 'student', 'parent']);

export async function GET(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const deleted = searchParams.get('deleted') === 'true';
    const users = await prisma.user.findMany({
      where: deletionScope(deleted),
      orderBy: { createdAt: 'desc' },
      select: { id: true, institutionId: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true, deletedAt: true },
    });
    return NextResponse.json({ items: users.map((user) => ({ ...user, _id: user.id })) });
  } catch (error) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const body = await req.json();
    const { name, email, phone, role = 'admin', institutionId, password = 'ChangeMe123!', active = true } = body;
    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    if (!allowedRoles.has(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    if (String(password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    const user = await prisma.user.create({ data: { name, email: String(email).toLowerCase(), phone, role: role as UserRole, institutionId: institutionId || undefined, password: await bcrypt.hash(password, 12), active: typeof active === 'boolean' ? active : String(active) !== 'false' } });
    return NextResponse.json({ item: { ...user, _id: user.id } }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

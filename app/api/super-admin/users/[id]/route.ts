import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import { duplicateError, restoreData, safeDeleteData, withMongoId } from '@/lib/prisma-utils';
import type { UserRole } from '@prisma/client';

const allowedRoles = new Set<UserRole>(['super_admin', 'institution_admin', 'admin', 'teacher', 'student', 'parent']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, institutionId: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true, passwordChangedAt: true, deletedAt: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ item: withMongoId(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { name, email, phone, role = existing.role, institutionId, active, password } = body;
    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    if (!allowedRoles.has(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

    if (existing.id === auth.userId && active === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }

    const data: {
      name: string;
      email: string;
      phone?: string | null;
      role: UserRole;
      institutionId?: string | null;
      active: boolean;
      password?: string;
      passwordChangedAt?: Date;
      refreshTokenHash?: null;
      resetTokenHash?: null;
      resetTokenExpiresAt?: null;
    } = {
      name,
      email: String(email).toLowerCase(),
      phone: phone || null,
      role,
      institutionId: institutionId || null,
      active: typeof active === 'boolean' ? active : String(active) !== 'false',
    };

    if (password) {
      if (String(password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
      data.password = await bcrypt.hash(String(password), 12);
      data.passwordChangedAt = new Date();
      data.refreshTokenHash = null;
      data.resetTokenHash = null;
      data.resetTokenExpiresAt = null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, institutionId: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true, deletedAt: true },
    });

    return NextResponse.json({ item: withMongoId(user) });
  } catch (error) {
    console.error('Update user error:', error);
    if (duplicateError(error)) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    if (!body.restore) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    const user = await prisma.user.update({
      where: { id },
      data: restoreData({ active: true }),
      select: { id: true, institutionId: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true, deletedAt: true },
    });
    return NextResponse.json({ item: withMongoId(user), message: 'User restored successfully.' });
  } catch (error) {
    console.error('Restore user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.superAdmin);
    if (response) return response;
    const { id } = await params;
    if (id === auth.userId) return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this user before permanent delete.' }, { status: 400 });
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'User permanently deleted.' });
    }

    await prisma.user.update({ where: { id }, data: safeDeleteData(auth, { active: false, refreshTokenHash: null }) });
    return NextResponse.json({ success: true, message: 'User moved to deleted records.' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

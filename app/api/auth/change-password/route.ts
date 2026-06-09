import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'New password must be at least 8 characters.';
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'New password must contain at least one letter and one number.';
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    const passwordError = validatePassword(newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user || !user.active) return NextResponse.json({ error: 'User not found or inactive.' }, { status: 404 });

    const valid = await bcrypt.compare(String(currentPassword || ''), user.password);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(String(newPassword), 12),
        passwordChangedAt: new Date(),
        refreshTokenHash: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    const response = NextResponse.json({ success: true, message: 'Password changed successfully. Please sign in again.' });
    response.cookies.set('auth_token', '', { httpOnly: true, expires: new Date(0), path: '/' });
    response.cookies.set('refresh_token', '', { httpOnly: true, expires: new Date(0), path: '/' });
    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

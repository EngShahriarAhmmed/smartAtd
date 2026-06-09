import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const resetToken = String(token || '').trim();

    if (!normalizedEmail || !resetToken) {
      return NextResponse.json({ error: 'Email and reset token are required.' }, { status: 400 });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, active: true } });
    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    if (user.resetTokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Reset token has expired.' }, { status: 400 });
    }

    const suppliedTokenHash = hashToken(resetToken);
    if (suppliedTokenHash !== user.resetTokenHash) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

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

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

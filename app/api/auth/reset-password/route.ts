import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const resetAttempts = new Map<string, { count: number; resetAt: number }>();

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

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function rateLimitKey(req: NextRequest, email: string) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${ip}:${email}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = resetAttempts.get(key);

  if (!current || current.resetAt < now) {
    resetAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  resetAttempts.set(key, current);
  return current.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const resetToken = String(token || '').trim();

    if (!normalizedEmail || !resetToken) {
      return NextResponse.json({ error: 'Email and reset token are required.' }, { status: 400 });
    }

    const key = rateLimitKey(req, normalizedEmail);
    if (isRateLimited(key)) {
      return NextResponse.json({ error: 'Too many reset attempts. Please request a new reset link later.' }, { status: 429 });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        active: true,
        deletedAt: null,
      },
    });

    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    if (user.resetTokenExpiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: null, resetTokenExpiresAt: null },
      });
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const suppliedTokenHash = hashToken(resetToken);
    if (!safeEqual(suppliedTokenHash, user.resetTokenHash)) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
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

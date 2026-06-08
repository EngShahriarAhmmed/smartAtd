import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signRefreshToken, signToken } from '@/lib/auth';
import { withMongoId } from '@/lib/prisma-utils';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: String(email).toLowerCase(), active: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId || undefined,
    };

    const token = signToken(payload);
    const refreshToken = signRefreshToken(payload);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash } });

    const response = NextResponse.json({
      success: true,
      user: withMongoId({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId,
        active: user.active,
      }),
    });

    const secure = process.env.NODE_ENV === 'production';

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

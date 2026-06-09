import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { signToken, verifyRefreshToken } from '@/lib/auth';
import { notDeletedWhere } from '@/lib/prisma-utils';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value;
    if (!refreshToken) return NextResponse.json({ error: 'Refresh token required' }, { status: 401 });

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });

    const user = await prisma.user.findFirst({ where: { id: payload.userId, ...notDeletedWhere() } });
    if (!user || !user.active) return NextResponse.json({ error: 'User disabled' }, { status: 401 });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (user.refreshTokenHash && user.refreshTokenHash !== tokenHash) {
      return NextResponse.json({ error: 'Refresh token mismatch' }, { status: 401 });
    }

    const accessToken = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId || undefined,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

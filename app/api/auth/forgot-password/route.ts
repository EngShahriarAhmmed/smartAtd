import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, active: true } });
    const genericMessage = 'If the email exists, a reset token has been generated.';

    if (!user) {
      return NextResponse.json({ success: true, message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiresAt },
    });

    const payload: Record<string, unknown> = {
      success: true,
      message: genericMessage,
      expiresAt: resetTokenExpiresAt.toISOString(),
    };

    if (process.env.NODE_ENV !== 'production') {
      payload.resetToken = resetToken;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

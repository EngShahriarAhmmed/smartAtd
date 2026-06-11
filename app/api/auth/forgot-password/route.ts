import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getAppUrl, sendMail } from '@/lib/email';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;
const forgotAttempts = new Map<string, { count: number; resetAt: number }>();

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function genericResponse() {
  return NextResponse.json({
    success: true,
    message: 'If the email exists, password reset instructions have been sent to that email address.',
  });
}

function rateLimitKey(req: NextRequest, email: string) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${ip}:${email}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = forgotAttempts.get(key);

  if (!current || current.resetAt < now) {
    forgotAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  forgotAttempts.set(key, current);
  return current.count > MAX_REQUESTS;
}

function buildEmailHtml(resetUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:24px">
        <h2 style="margin:0 0 12px;font-size:22px">Reset your Smart QR Attendance password</h2>
        <p style="margin:0 0 16px;line-height:1.6;color:#475569">
          We received a request to reset your password. Click the button below to set a new password.
        </p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;padding:12px 18px">
            Reset Password
          </a>
        </p>
        <p style="margin:0 0 10px;line-height:1.6;color:#475569">
          This link will expire in 30 minutes and can be used only once.
        </p>
        <p style="margin:0;line-height:1.6;color:#64748b;font-size:13px">
          If you did not request this, please ignore this email or contact the administrator.
        </p>
      </div>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const key = rateLimitKey(req, normalizedEmail);
    if (isRateLimited(key)) {
      return genericResponse();
    }

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        active: true,
        deletedAt: null,
      },
    });

    if (!user) {
      return genericResponse();
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const resetUrl = `${getAppUrl()}/login?mode=reset&email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(resetToken)}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiresAt },
    });

    try {
      await sendMail({
        to: normalizedEmail,
        subject: 'Reset your Smart QR Attendance password',
        text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`,
        html: buildEmailHtml(resetUrl),
      });
    } catch (mailError) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: null, resetTokenExpiresAt: null },
      });
      console.error('Password reset email failed:', mailError);
      return genericResponse();
    }

    return genericResponse();
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

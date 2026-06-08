import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { UserRole } from '@/types';

const JWT_SECRET =
  process.env.JWT_SECRET || 'fallback-secret-change-me-minimum-32-characters';

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || JWT_SECRET;

const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '15m';

const JWT_REFRESH_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']) || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  institutionId?: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export function getAuthFromRequest(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}
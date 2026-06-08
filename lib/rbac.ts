import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, JWTPayload } from '@/lib/auth';
import type { UserRole } from '@/types';

export const ROLE_GROUPS = {
  superAdmin: ['super_admin'] as UserRole[],
  institutionAdmin: ['super_admin', 'institution_admin', 'admin'] as UserRole[],
  staff: ['super_admin', 'institution_admin', 'admin', 'teacher'] as UserRole[],
  authenticated: ['super_admin', 'institution_admin', 'admin', 'teacher', 'student', 'parent'] as UserRole[],
};

type AuthResult =
  | { auth: JWTPayload; response: null }
  | { auth: JWTPayload | null; response: NextResponse };

export function hasRole(auth: JWTPayload | null, allowedRoles: readonly UserRole[]) {
  return !!auth && allowedRoles.includes(auth.role as UserRole);
}

export function requireAuth(req: NextRequest, allowedRoles = ROLE_GROUPS.authenticated): AuthResult {
  const auth = getAuthFromRequest(req);

  if (!auth) {
    return {
      auth: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!hasRole(auth, allowedRoles)) {
    return {
      auth,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { auth, response: null };
}

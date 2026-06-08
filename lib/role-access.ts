import { redirect } from 'next/navigation';
import type { UserRole } from '@/types';
import type { JWTPayload } from '@/lib/auth';
import { getRoleHome } from '@/lib/role-home';

export function ensureRoleHome(auth: JWTPayload | null, allowedRoles: UserRole[]) {
  if (!auth) redirect('/login');
  if (!allowedRoles.includes(auth.role)) redirect(getRoleHome(auth.role));
  return auth;
}

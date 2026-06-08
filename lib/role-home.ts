import type { UserRole } from '@/types';

export function getRoleHome(role?: UserRole | string | null) {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'institution_admin':
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'student':
      return '/student';
    case 'parent':
      return '/parent';
    default:
      return '/login';
  }
}

export function getRoleLabel(role?: UserRole | string | null) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'institution_admin':
      return 'Institution Admin';
    case 'admin':
      return 'Admin';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    case 'parent':
      return 'Parent';
    default:
      return 'User';
  }
}

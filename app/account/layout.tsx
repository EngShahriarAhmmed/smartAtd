import { getAuthUser } from '@/lib/auth';
import { ensureRoleHome } from '@/lib/role-access';
import RoleBasedShell from '@/components/RoleBasedShell';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = ensureRoleHome(await getAuthUser(), ['super_admin', 'institution_admin', 'admin', 'teacher', 'student', 'parent']);

  return (
    <RoleBasedShell userEmail={user.email} userRole={user.role} institutionName={user.institutionId ? 'Institution Workspace' : 'Platform Workspace'}>
      {children}
    </RoleBasedShell>
  );
}

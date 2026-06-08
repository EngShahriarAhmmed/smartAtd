import { getAuthUser } from '@/lib/auth';
import { ensureRoleHome } from '@/lib/role-access';
import RoleBasedShell from '@/components/RoleBasedShell';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = ensureRoleHome(await getAuthUser(), ['super_admin']);

  return (
    <RoleBasedShell userEmail={user.email} userRole={user.role} institutionName="Platform Workspace">
      {children}
    </RoleBasedShell>
  );
}

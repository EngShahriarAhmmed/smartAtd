import { getAuthUser } from '@/lib/auth';
import { ensureRoleHome } from '@/lib/role-access';
import RoleBasedShell from '@/components/RoleBasedShell';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = ensureRoleHome(await getAuthUser(), ['parent']);

  return (
    <RoleBasedShell userEmail={user.email} userRole={user.role} institutionName="Parent Portal">
      {children}
    </RoleBasedShell>
  );
}

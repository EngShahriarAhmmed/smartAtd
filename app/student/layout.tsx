import { getAuthUser } from '@/lib/auth';
import { ensureRoleHome } from '@/lib/role-access';
import RoleBasedShell from '@/components/RoleBasedShell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = ensureRoleHome(await getAuthUser(), ['student']);

  return (
    <RoleBasedShell userEmail={user.email} userRole={user.role} institutionName="Student Portal">
      {children}
    </RoleBasedShell>
  );
}

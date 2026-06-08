import { getAuthUser } from '@/lib/auth';
import { ensureRoleHome } from '@/lib/role-access';
import RoleBasedShell from '@/components/RoleBasedShell';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = ensureRoleHome(await getAuthUser(), ['teacher']);

  return (
    <RoleBasedShell userEmail={user.email} userRole={user.role} institutionName="Teacher Workspace">
      {children}
    </RoleBasedShell>
  );
}

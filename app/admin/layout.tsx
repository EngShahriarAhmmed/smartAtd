import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userEmail={user.email} userRole={user.role} />
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', marginLeft: 240 }}>
        {children}
      </main>
    </div>
  );
}

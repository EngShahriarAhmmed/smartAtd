import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getRoleHome } from '@/lib/role-home';

export default async function Home() {
  const user = await getAuthUser();
  if (user) redirect(getRoleHome(user.role));
  redirect('/login');
}

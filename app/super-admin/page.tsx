import { ActionCard, MetricCard } from '@/components/RoleHomePage';
import { BarChart3, Building2, UserCog, WalletCards } from 'lucide-react';

export default function SuperAdminDashboard() {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-900 p-7 text-white shadow-xl shadow-blue-950/10">
        <div className="text-sm font-bold uppercase tracking-wide text-blue-200">Super Admin</div>
        <h1 className="mt-2 text-3xl font-black">Platform Control Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">Manage institutions, subscriptions, platform users, usage analytics and SaaS-level monitoring.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Institutions" value="0" tone="blue" />
        <MetricCard label="Active Plans" value="0" tone="green" />
        <MetricCard label="Users" value="0" tone="violet" />
        <MetricCard label="Alerts" value="0" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/super-admin/institutions" title="Institutions" description="Create and monitor schools, colleges, madrasas and branches." icon={<Building2 size={22} />} />
        <ActionCard href="/super-admin/subscriptions" title="Subscriptions" description="Manage SaaS plans, renewals, billing status and limits." icon={<WalletCards size={22} />} />
        <ActionCard href="/super-admin/analytics" title="Usage Analytics" description="Track platform activity, scans, logins, storage and growth." icon={<BarChart3 size={22} />} />
        <ActionCard href="/super-admin/users" title="Platform Users" description="Control super admins and global support users." icon={<UserCog size={22} />} />
      </div>
    </div>
  );
}

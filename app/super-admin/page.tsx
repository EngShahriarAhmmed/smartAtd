'use client';

import { useEffect, useState } from 'react';
import { ActionCard, MetricCard } from '@/components/RoleHomePage';
import { BarChart3, Building2, Loader2, Settings, UserCog, WalletCards } from 'lucide-react';

type Overview = {
  institutions: number;
  activeInstitutions: number;
  users: number;
  students: number;
  teachers: number;
  attendance: number;
  pendingNotifications: number;
  activePlans: number;
  platformSettings: number;
};

export default function SuperAdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch('/api/super-admin/overview', { cache: 'no-store' })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-900 p-7 text-white shadow-xl shadow-blue-950/10">
        <div className="text-sm font-bold uppercase tracking-wide text-blue-200">Super Admin</div>
        <h1 className="mt-2 text-3xl font-black">Platform Control Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">Manage institutions, subscriptions, platform users, usage analytics and SaaS-level monitoring.</p>
      </div>

      {!data ? (
        <div className="mb-6 flex min-h-[160px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="animate-spin" size={36} /></div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Institutions" value={data.institutions || 0} tone="blue" />
          <MetricCard label="Active Plans" value={data.activePlans || 0} tone="green" />
          <MetricCard label="Users" value={data.users || 0} tone="violet" />
          <MetricCard label="Alerts" value={data.pendingNotifications || 0} tone="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/super-admin/institutions" title="Institutions" description="Create, view, edit and deactivate schools, colleges, madrasas and branches." icon={<Building2 size={22} />} />
        <ActionCard href="/super-admin/subscriptions" title="Subscriptions" description="Manage SaaS plans, limits, features and billing status." icon={<WalletCards size={22} />} />
        <ActionCard href="/super-admin/analytics" title="Usage Analytics" description="Track platform activity, scans, users, institutions and growth." icon={<BarChart3 size={22} />} />
        <ActionCard href="/super-admin/users" title="Platform Users" description="Control super admins, institution users and role-based accounts." icon={<UserCog size={22} />} />
        <ActionCard href="/super-admin/settings" title="Platform Settings" description="Configure security, tenant defaults, notifications and limits." icon={<Settings size={22} />} />
      </div>
    </div>
  );
}

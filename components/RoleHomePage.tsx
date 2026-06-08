import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function MetricCard({ label, value, tone = 'blue' }: { label: string; value: string | number; tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet' }) {
  const tones = {
    blue: 'from-blue-50 to-sky-50 text-blue-700 border-blue-100',
    green: 'from-emerald-50 to-green-50 text-emerald-700 border-emerald-100',
    amber: 'from-amber-50 to-yellow-50 text-amber-700 border-amber-100',
    red: 'from-red-50 to-rose-50 text-red-700 border-red-100',
    violet: 'from-violet-50 to-purple-50 text-violet-700 border-violet-100',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="text-sm font-bold opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-black">{value}</div>
    </div>
  );
}

export function ActionCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: ReactNode }) {
  return (
    <Link href={href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
        {icon}
      </div>
      <div className="text-base font-black text-slate-900">{title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-700">
        Open <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">Module</div>
        <h1 className="mt-3 text-2xl font-black text-slate-900">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Status" value="Ready" tone="green" />
        <MetricCard label="Design" value="Updated" tone="blue" />
        <MetricCard label="Access" value="Role Based" tone="violet" />
      </div>

      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <div className="font-black">Implementation placeholder</div>
        <p className="mt-1 text-sm leading-6">This menu page is wired into the role dashboard. Connect its table/form API when you are ready to add full CRUD or reports.</p>
      </div>
    </div>
  );
}

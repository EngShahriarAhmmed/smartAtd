import { ActionCard, MetricCard } from '@/components/RoleHomePage';
import { BarChart3, FileBarChart, MessageSquareWarning } from 'lucide-react';

export default function ParentDashboard() {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-700 to-blue-600 p-7 text-white shadow-xl shadow-emerald-700/10">
        <div className="text-sm font-bold uppercase tracking-wide text-emerald-100">Parent</div>
        <h1 className="mt-2 text-3xl font-black">Parent Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50">Monitor child attendance, receive absence alerts and review attendance trends.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Children" value="0" tone="blue" />
        <MetricCard label="Attendance" value="0%" tone="green" />
        <MetricCard label="Alerts" value="0" tone="amber" />
        <MetricCard label="Risk" value="N/A" tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/parent/attendance" title="Child Attendance" description="View daily and monthly attendance status." icon={<BarChart3 size={22} />} />
        <ActionCard href="/parent/alerts" title="Absence Alerts" description="Review absence, risk and notification history." icon={<MessageSquareWarning size={22} />} />
        <ActionCard href="/parent/reports" title="Reports" description="Download attendance and non-collegiate reports." icon={<FileBarChart size={22} />} />
      </div>
    </div>
  );
}

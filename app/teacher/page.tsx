import { ActionCard, MetricCard } from '@/components/RoleHomePage';
import { ClipboardList, FileBarChart, GraduationCap, ScanLine } from 'lucide-react';

export default function TeacherDashboard() {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-700 to-emerald-600 p-7 text-white shadow-xl shadow-blue-700/10">
        <div className="text-sm font-bold uppercase tracking-wide text-blue-100">Teacher</div>
        <h1 className="mt-2 text-3xl font-black">Teaching Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">Scan QR codes, monitor class attendance, review period-wise history and subject performance.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Today’s Classes" value="0" tone="blue" />
        <MetricCard label="Attendance Taken" value="0" tone="green" />
        <MetricCard label="Pending" value="0" tone="amber" />
        <MetricCard label="Reports" value="0" tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/teacher/scanner" title="QR Scanner" description="Start camera scanner and take period-wise attendance." icon={<ScanLine size={22} />} />
        <ActionCard href="/teacher/classes" title="My Classes" description="View assigned classes, sections, subjects and periods." icon={<GraduationCap size={22} />} />
        <ActionCard href="/teacher/attendance" title="Attendance History" description="Review previous attendance records and duplicate scans." icon={<ClipboardList size={22} />} />
        <ActionCard href="/teacher/reports" title="Subject Reports" description="Analyze subject-wise class attendance performance." icon={<FileBarChart size={22} />} />
      </div>
    </div>
  );
}

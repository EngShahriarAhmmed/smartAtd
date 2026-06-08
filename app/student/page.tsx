import { ActionCard, MetricCard } from '@/components/RoleHomePage';
import { BarChart3, ClipboardList, GraduationCap, IdCard } from 'lucide-react';

export default function StudentDashboard() {
  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-700 to-sky-500 p-7 text-white shadow-xl shadow-blue-700/10">
        <div className="text-sm font-bold uppercase tracking-wide text-blue-100">Student</div>
        <h1 className="mt-2 text-3xl font-black">Student Portal</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">View attendance percentage, subject-wise attendance, history and your QR ID card.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Attendance" value="0%" tone="blue" />
        <MetricCard label="Risk Level" value="N/A" tone="green" />
        <MetricCard label="Subjects" value="0" tone="violet" />
        <MetricCard label="Absences" value="0" tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/student/attendance" title="Attendance %" description="Check overall attendance and non-collegiate risk." icon={<BarChart3 size={22} />} />
        <ActionCard href="/student/subjects" title="Subject Reports" description="View subject-wise percentage and class performance." icon={<GraduationCap size={22} />} />
        <ActionCard href="/student/id-card" title="ID Card" description="View and download your student QR ID card." icon={<IdCard size={22} />} />
        <ActionCard href="/student/history" title="History" description="Review your daily attendance record." icon={<ClipboardList size={22} />} />
      </div>
    </div>
  );
}

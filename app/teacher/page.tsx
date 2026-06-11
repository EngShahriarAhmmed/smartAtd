'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileBarChart,
  GraduationCap,
  Loader2,
  Percent,
  ScanLine,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ActionCard, MetricCard } from '@/components/RoleHomePage';
import { useToast } from '@/components/ToastProvider';

type TeacherSummary = {
  teacher?: {
    _id?: string;
    name?: string;
    employeeId?: string;
    designation?: string | null;
    department?: string | null;
    email?: string | null;
  } | null;
  date: string;
  dayName: string;
  summary: {
    todayClasses: number;
    scheduledClasses: number;
    completedScheduled: number;
    pendingScheduled: number;
    attendanceTaken: number;
    todayUniqueStudents: number;
    monthUniqueStudents: number;
    monthAttendanceTaken: number;
    monthClassScans: number;
    totalSessions: number;
    subjectCount: number;
    classCount: number;
    periodCount: number;
    todayAttendanceRate: number;
    possibleTodayAttendance: number;
    recentAttendanceCount: number;
  };
  lists: {
    subjects: string[];
    classes: string[];
    periods: string[];
  };
  todaySchedule: Array<{
    _id: string;
    class?: string;
    section?: string;
    subject?: string;
    period?: string;
    completed?: boolean;
  }>;
  recentLogs: Array<{
    _id: string;
    date: string;
    class: string;
    section: string;
    subject?: string;
    period?: string;
    scanCount: number;
    startTime: string;
    endTime?: string | null;
  }>;
  recentAttendance: Array<{
    _id: string;
    date: string;
    class: string;
    section: string;
    subject?: string;
    period?: string;
    status: string;
    markedAt: string;
  }>;
};

function numberFormat(value?: number) {
  return new Intl.NumberFormat().format(value || 0);
}

function shortTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TeacherDashboard() {
  const toast = useToast();
  const [data, setData] = useState<TeacherSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/teacher/summary', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Unable to load teacher dashboard.');
        if (alive) setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load teacher dashboard.';
        if (alive) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [toast]);

  const completionRate = useMemo(() => {
    if (!data?.summary.scheduledClasses) return 0;
    return Math.round((data.summary.completedScheduled / data.summary.scheduledClasses) * 100);
  }, [data]);

  const teacherName = data?.teacher?.name || 'Teacher';

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-blue-700" size={48} />
          <p className="mt-3 text-sm font-semibold text-slate-500">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        <div className="text-xl font-black">Teacher dashboard unavailable</div>
        <p className="mt-2 text-sm font-semibold">{error || 'Unable to load teacher dashboard.'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-slate-950 via-blue-800 to-emerald-600 p-7 text-white">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                Teacher Workspace
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Welcome, {teacherName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">
                Monitor today’s classes, QR scans, students reached, class logs, subject coverage, and attendance progress from one dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/90">
                {data.teacher?.employeeId && <span className="rounded-full bg-white/15 px-3 py-1">ID: {data.teacher.employeeId}</span>}
                {data.teacher?.department && <span className="rounded-full bg-white/15 px-3 py-1">{data.teacher.department}</span>}
                <span className="rounded-full bg-white/15 px-3 py-1">{data.dayName}, {data.date}</span>
              </div>
            </div>

            <Link
              href="/teacher/scanner"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <ScanLine size={18} />
              Start QR Scanner
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today’s Classes" value={numberFormat(data.summary.todayClasses)} tone="blue" />
        <MetricCard label="Today’s QR Scans" value={numberFormat(data.summary.attendanceTaken)} tone="green" />
        <MetricCard label="Students Reached" value={numberFormat(data.summary.todayUniqueStudents)} tone="violet" />
        <MetricCard label="Attendance Rate" value={`${data.summary.todayAttendanceRate}%`} tone="amber" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBox icon={<CalendarCheck size={21} />} label="Scheduled Today" value={data.summary.scheduledClasses} helper={`${data.summary.completedScheduled} completed, ${data.summary.pendingScheduled} pending`} tone="blue" />
        <StatBox icon={<TrendingUp size={21} />} label="Monthly Scans" value={data.summary.monthAttendanceTaken} helper={`${data.summary.monthUniqueStudents} unique students`} tone="green" />
        <StatBox icon={<BookOpen size={21} />} label="Subjects Covered" value={data.summary.subjectCount} helper={`${data.summary.periodCount} periods used`} tone="violet" />
        <StatBox icon={<GraduationCap size={21} />} label="Class Sections" value={data.summary.classCount} helper={`${data.summary.totalSessions} total sessions`} tone="amber" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Today’s Schedule Progress</h2>
              <p className="text-sm text-slate-500">Routine-based expected classes compared with completed logs.</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Percent size={24} />
            </div>
          </div>

          <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${Math.min(completionRate, 100)}%` }} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStat label="Completion" value={`${completionRate}%`} />
            <MiniStat label="Completed" value={data.summary.completedScheduled} />
            <MiniStat label="Pending" value={data.summary.pendingScheduled} />
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {data.todaySchedule.length ? (
              data.todaySchedule.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-black text-slate-900">Class {item.class || '—'}-{item.section || '—'}</div>
                    <div className="text-xs font-semibold text-slate-500">{item.subject || 'General'} • {item.period || 'No period'}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${item.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                No routine found for today. QR scans will still create class logs automatically.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Recent Class Logs</h2>
              <p className="text-sm text-slate-500">Latest period-wise activity from scanner or manual log.</p>
            </div>
            <Link href="/teacher/class-logs" className="text-sm font-black text-blue-700 hover:text-blue-900">View all</Link>
          </div>

          <div className="space-y-3">
            {data.recentLogs.length ? (
              data.recentLogs.slice(0, 6).map((log) => (
                <div key={log._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">Class {log.class}-{log.section} • {log.subject || 'General'}</div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">{log.date} • {log.period || 'No period'} • {shortTime(log.startTime)}</div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{log.scanCount} scans</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                No class log found. Start QR scanner to create the first log.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/teacher/scanner" title="QR Scanner" description="Start camera scanner and take period-wise attendance." icon={<ScanLine size={22} />} />
        <ActionCard href="/teacher/classes" title="My Classes" description="View classes, sections, subjects and activity history." icon={<GraduationCap size={22} />} />
        <ActionCard href="/teacher/attendance" title="Attendance History" description="Review records marked by you with date and period filters." icon={<ClipboardList size={22} />} />
        <ActionCard href="/teacher/reports" title="Subject Reports" description="Analyze subject-wise class attendance performance." icon={<FileBarChart size={22} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoPanel title="Active Subjects" icon={<BookOpen size={18} />} items={data.lists.subjects} empty="No subjects recorded yet." />
        <InfoPanel title="Active Classes" icon={<Users size={18} />} items={data.lists.classes} empty="No class activity recorded yet." />
        <InfoPanel title="Used Periods" icon={<Clock3 size={18} />} items={data.lists.periods} empty="No period activity recorded yet." />
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, helper, tone }: { icon: ReactNode; label: string; value: number; helper: string; tone: 'blue' | 'green' | 'violet' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
        <Activity size={18} className="text-slate-300" />
      </div>
      <div className="mt-4 text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-black text-slate-950">{numberFormat(value)}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{helper}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function InfoPanel({ title, icon, items, empty }: { title: string; icon: ReactNode; items: string[]; empty: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-base font-black text-slate-900">
        {icon}
        {title}
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.slice(0, 12).map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-500">{empty}</p>
      )}
      {items.length > 12 && <p className="mt-3 text-xs font-semibold text-slate-400">+{items.length - 12} more</p>}
    </div>
  );
}

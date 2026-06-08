'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Clock,
  QrCode,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
  activeSessions: number;
  recentAttendance: {
    _id: string;
    status: string;
    markedAt: string;
    studentId: { name: string; studentId: string; class: string; section: string };
  }[];
  classStats: { class: string; present: number; total: number }[];
  date: string;
}

function DashboardCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'sky';
}) {
  const tones = {
    blue: 'from-blue-50 to-sky-50 text-blue-700 border-blue-100',
    green: 'from-emerald-50 to-green-50 text-emerald-700 border-emerald-100',
    amber: 'from-amber-50 to-yellow-50 text-amber-700 border-amber-100',
    red: 'from-red-50 to-rose-50 text-red-700 border-red-100',
    violet: 'from-violet-50 to-purple-50 text-violet-700 border-violet-100',
    sky: 'from-sky-50 to-cyan-50 text-sky-700 border-sky-100',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold opacity-80">{label}</span>
        <span>{icon}</span>
      </div>
      <div className="text-3xl font-black">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((response) => response.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });

    const timer = setInterval(() => {
      fetch('/api/dashboard')
        .then((response) => response.json())
        .then(setStats);
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-center text-slate-500">
        <div>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm font-bold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-900 p-7 text-white shadow-xl shadow-blue-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-blue-200">Institution Admin</div>
            <h1 className="mt-2 text-3xl font-black">Attendance Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
              {new Date(stats.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/attendance" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm transition hover:bg-blue-50">
              View Attendance
            </Link>
            <Link href="/admin/qr" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20">
              QR Cards
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard label="Total Students" value={stats.totalStudents} icon={<Users size={23} />} tone="blue" />
        <DashboardCard label="Present Today" value={stats.presentToday} icon={<CheckCircle2 size={23} />} tone="green" />
        <DashboardCard label="Late Today" value={stats.lateToday} icon={<Clock size={23} />} tone="amber" />
        <DashboardCard label="Absent Today" value={stats.absentToday} icon={<UserX size={23} />} tone="red" />
        <DashboardCard label="Attendance Rate" value={`${stats.attendanceRate}%`} icon={<TrendingUp size={23} />} tone="violet" />
        <DashboardCard label="Active Sessions" value={stats.activeSessions} icon={<QrCode size={23} />} tone="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <Activity size={18} />
              Recent Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">Live updates refresh every 15 seconds.</p>
          </div>

          <div className="p-5">
            {stats.recentAttendance.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">
                No attendance recorded today
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentAttendance.map((record) => (
                  <div key={record._id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">{record.studentId?.name}</div>
                      <div className="mt-0.5 text-xs font-medium text-slate-500">
                        Class {record.studentId?.class}-{record.studentId?.section} •{' '}
                        {new Date(record.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`badge ${record.status === 'present' ? 'badge-success' : record.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>{record.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <CalendarClock size={18} />
              Class-wise Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">Today’s present count against active students.</p>
          </div>

          <div className="p-5">
            {stats.classStats.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-400">
                No classes found
              </div>
            ) : (
              <div className="space-y-4">
                {stats.classStats.map((item) => {
                  const percentage = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
                  return (
                    <div key={item.class}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-black text-slate-900">Class {item.class}</span>
                        <span className="font-bold text-slate-500">{item.present}/{item.total} ({percentage}%)</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, QrCode, ShieldCheck, Users } from 'lucide-react';
import { getRoleHome } from '@/lib/role-home';

const demoUsers = [
  { label: 'Admin', email: 'admin@school.com', password: 'admin123' },
  { label: 'Super Admin', email: 'superadmin@platform.com', password: 'superadmin123' },
  { label: 'Teacher', email: 'teacher@school.com', password: 'teacher123' },
  { label: 'Student', email: 'student@school.com', password: 'student123' },
  { label: 'Parent', email: 'parent@school.com', password: 'parent123' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || 'Login failed');
      return;
    }

    router.push(getRoleHome(data.user?.role));
  }

  async function seedDB() {
    setLoading(true);
    setError('');

    const response = await fetch('/api/seed', { method: 'POST' });
    const data = await response.json();

    setLoading(false);

    if (data.success) {
      setEmail('admin@school.com');
      setPassword('admin123');
      return;
    }

    setError(data.error || 'Seed failed');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_38%,#ecfdf5_100%)] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-2xl shadow-slate-200/70 backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white xl:block">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg shadow-blue-500/20">
                  <QrCode size={25} />
                </div>
                <div>
                  <div className="text-lg font-black">Smart QR Attendance</div>
                  <div className="text-sm text-slate-400">Class Monitoring System</div>
                </div>
              </div>

              <h1 className="max-w-xl text-4xl font-black leading-tight">
                Role-based QR attendance for modern educational institutions.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
                Manage students, teachers, periods, attendance scans, non-collegiate reports, parents, and dashboards from one responsive system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <ShieldCheck className="mb-3 text-emerald-300" />
                <div className="font-black">Secure QR</div>
                <p className="mt-1 text-xs leading-5 text-slate-300">Encrypted token flow with duplicate scan prevention.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <Users className="mb-3 text-blue-300" />
                <div className="font-black">Multi-role</div>
                <p className="mt-1 text-xs leading-5 text-slate-300">Separate dashboards for admin, teacher, student and parent.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center xl:text-left">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 xl:mx-0">
                <QrCode size={26} />
              </div>
              <h2 className="text-3xl font-black text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to continue to your role dashboard.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@school.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                Sign In
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">Demo accounts</div>
                  <div className="text-xs text-slate-500">Seed first, then select any role.</div>
                </div>
                
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoUsers.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => {
                      setEmail(user.email);
                      setPassword(user.password);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="font-black text-slate-900">{user.label}</div>
                    <div className="truncate text-slate-500">{user.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

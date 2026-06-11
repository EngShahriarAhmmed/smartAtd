'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { getRoleHome } from '@/lib/role-home';

const demoUsers = [
  { label: 'Admin', email: 'admin@school.com', password: 'admin123' },
  { label: 'Super Admin', email: 'superadmin@platform.com', password: 'superadmin123' },
  { label: 'Teacher', email: 'teacher@school.com', password: 'teacher123' },
  { label: 'Student', email: 'student@school.com', password: 'student123' },
  { label: 'Parent', email: 'parent@school.com', password: 'parent123' },
];

type Mode = 'login' | 'forgot' | 'reset';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
      setError('Your session expired. Please sign in again.');
    }

    if (params.get('mode') === 'reset') {
      setMode('reset');
      setEmail(params.get('email') || '');
      setResetToken(params.get('token') || '');
    }
  }, []);

  function clearAlerts() {
    setError('');
    setSuccess('');
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearAlerts();

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

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearAlerts();

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || 'Password reset request failed');
      return;
    }

    setSuccess(data.message || 'If the email exists, password reset instructions have been sent to that email address.');
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearAlerts();

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setError('New password and confirm password do not match.');
      return;
    }

    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token: resetToken, newPassword }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || 'Password reset failed');
      return;
    }

    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setSuccess(data.message || 'Password reset successfully. Please sign in.');
    setMode('login');
  }

  async function seedDB() {
    setLoading(true);
    clearAlerts();

    const response = await fetch('/api/seed', { method: 'POST' });
    const data = await response.json();

    setLoading(false);

    if (data.success) {
      setEmail('admin@school.com');
      setPassword('admin123');
      setSuccess('Demo data seeded. Admin credentials selected.');
      setMode('login');
      return;
    }

    setError(data.error || 'Seed failed');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_40%,#ecfdf5_100%)] p-3 sm:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-cols-1 overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur xl:min-h-[calc(100vh-2rem)] xl:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-full overflow-hidden bg-slate-950 xl:block">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/brand/login-banner.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950/85 to-transparent" />

          <div className="relative z-10 flex h-full min-h-[620px] flex-col justify-between p-8 text-white">
            <div className="inline-flex w-fit items-center gap-3 rounded-3xl border border-white/20 bg-white/15 px-4 py-3 shadow-xl shadow-slate-950/20">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg">
                <Image
                  src="/brand/logo-mark.png"
                  alt="Smart QR Attendance logo mark"
                  width={56}
                  height={56}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="text-lg font-black leading-tight">Smart QR Attendance</div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">Digital & Verified Attendance</div>
              </div>
            </div>

            <div className="max-w-xl rounded-[2rem] border border-white/15 bg-slate-950/35 p-7 shadow-2xl shadow-slate-950/20 ">
              <div className="mb-3 inline-flex rounded-full border border-emerald-200/30 bg-emerald-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                Secure QR Platform
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight">
                Complete role-based attendance with verified QR scanning.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200">
                Manage students, teachers, periods, QR scans, reports, notifications, device binding, and role dashboards from one responsive system.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-full justify-center overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="w-full max-w-md self-start lg:self-center">
            <div className="mb-5 text-center xl:text-left">
              <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center overflow-visible rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:mx-0">
                <Image
                  src="/brand/logo-mark.png"
                  alt="Smart QR Attendance"
                  width={96}
                  height={96}
                  priority
                  className="max-h-full max-w-full object-scale-down"
                />
              </div>
              <h2 className="text-3xl font-black text-slate-950">
                {mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Forgot password' : 'Reset password'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === 'login'
                  ? 'Sign in to continue to your role dashboard.'
                  : mode === 'forgot'
                    ? 'Enter your account email to receive a secure reset link.'
                    : 'Open the email reset link or paste the token and set your new password.'}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {(['login', 'forgot', 'reset'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    clearAlerts();
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-black capitalize transition ${
                    mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            )}

            {mode === 'login' && (
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
            )}

            {mode === 'forgot' && (
              <form onSubmit={requestReset} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Account Email</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="user@school.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
                  Send Reset Link
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Account Email</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="user@school.com"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Reset Token / Link Token</label>
                  <input
                    className="input"
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    placeholder="Paste token from email link"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">New Password</label>
                  <input
                    className="input"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Confirm Password</label>
                  <input
                    className="input"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
                  Reset Password
                </button>
              </form>
            )}

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
                      setMode('login');
                      clearAlerts();
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, Loader2, QrCode, RefreshCw, ShieldCheck, Users } from 'lucide-react';
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

    if (data.resetToken) {
      setResetToken(data.resetToken);
      setSuccess(`Reset token generated. It expires at ${new Date(data.expiresAt).toLocaleString()}.`);
      setMode('reset');
      return;
    }

    setSuccess(data.message || 'If the email exists, a reset instruction has been generated.');
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
                Complete role-based attendance with secure account recovery.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
                Manage students, teachers, periods, QR scans, reports, role dashboards, password reset, and user self-service from one responsive system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <ShieldCheck className="mb-3 text-emerald-300" />
                <div className="font-black">Secure Access</div>
                <p className="mt-1 text-xs leading-5 text-slate-300">JWT login, refresh logout, password reset tokens and change-password flow.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <Users className="mb-3 text-blue-300" />
                <div className="font-black">Multi-role</div>
                <p className="mt-1 text-xs leading-5 text-slate-300">Separate dashboards for super admin, admin, teacher, student and parent.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center xl:text-left">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 xl:mx-0">
                <QrCode size={26} />
              </div>
              <h2 className="text-3xl font-black text-slate-950">{mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Forgot password' : 'Reset password'}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === 'login' ? 'Sign in to continue to your role dashboard.' : mode === 'forgot' ? 'Enter your account email to generate a reset token.' : 'Enter the reset token and your new password.'}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {(['login', 'forgot', 'reset'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setMode(item); clearAlerts(); }}
                  className={`rounded-xl px-3 py-2 text-xs font-black capitalize transition ${mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {item}
                </button>
              ))}
            </div>

            {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
            {success && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div>}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Email</label>
                  <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@school.com" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Password</label>
                  <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
                </div>
                <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                  Sign In
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={requestReset} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Account Email</label>
                  <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@school.com" required />
                </div>
                <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
                  Generate Reset Token
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Account Email</label>
                  <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@school.com" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Reset Token</label>
                  <input className="input" value={resetToken} onChange={(event) => setResetToken(event.target.value)} placeholder="Paste reset token" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">New Password</label>
                  <input className="input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Confirm Password</label>
                  <input className="input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" required />
                </div>
                <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
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
                <button type="button" onClick={seedDB} disabled={loading} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60">
                  Seed
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoUsers.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => { setEmail(user.email); setPassword(user.password); setMode('login'); clearAlerts(); }}
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

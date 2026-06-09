'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, LockKeyhole, LogOut, Mail, Phone, Save, ShieldCheck, UserCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getRoleLabel } from '@/lib/role-home';

type UserInfo = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  institutionId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setMessage({ ok: false, text: 'Unable to load user information.' }))
      .finally(() => setLoading(false));
  }, []);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ ok: false, text: 'New password and confirm password do not match.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to change password.' });
        return;
      }
      setMessage({ ok: true, text: data.message || 'Password changed successfully.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setMessage({ ok: false, text: 'Unable to change password.' });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-slate-900" size={44} /></div>;
  }

  return (
    <div>
      <div className="mb-6 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-900 p-7 text-white shadow-xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-blue-100">User Info</div>
            <h1 className="mt-2 text-3xl font-black">My Account</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Review logged-in user details, change password securely, or logout from the system.</p>
          </div>
          <button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><UserCircle size={22} /> Profile Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</div>
              <div className="mt-2 text-sm font-black text-slate-950">{user?.name || '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</div>
              <div className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">{getRoleLabel(user?.role)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Mail size={14} /> Email</div>
              <div className="mt-2 break-all text-sm font-semibold text-slate-950">{user?.email || '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Phone size={14} /> Phone</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{user?.phone || '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Institution ID</div>
              <div className="mt-2 break-all text-sm font-semibold text-slate-950">{user?.institutionId || 'Platform / Not assigned'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Account Status</div>
              <div className="mt-2 text-sm font-black text-emerald-700">{user?.active ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        </div>

        <form onSubmit={changePassword} className="card p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-950"><LockKeyhole size={22} /> Change Password</h2>
          <p className="mb-5 text-sm leading-6 text-slate-500">Use at least 8 characters with one letter and one number. After update, you will be redirected to login.</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Current Password</label>
              <input className="input" type="password" value={form.currentPassword} onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">New Password</label>
              <input className="input" type="password" value={form.newPassword} onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Confirm New Password</label>
              <input className="input" type="password" value={form.confirmPassword} onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Change Password
          </button>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
            <div className="mb-1 flex items-center gap-2 font-black"><ShieldCheck size={15} /> Security note</div>
            Existing refresh sessions are cleared after password change.
          </div>
        </form>
      </div>
    </div>
  );
}

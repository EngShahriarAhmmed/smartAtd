'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';

type InstitutionStatus = 'active' | 'inactive' | 'suspended';
type ToastType = 'success' | 'error' | 'info';

interface Institution {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  address?: string | null;
  logo?: string | null;
  status: InstitutionStatus;
}

interface SettingsResponse {
  institution: Institution | null;
  error?: string;
}

interface ToastState {
  type: ToastType;
  message: string;
  details?: string;
}

interface FormState {
  name: string;
  code: string;
  address: string;
  logo: string;
  status: InstitutionStatus;
}

const emptyForm: FormState = {
  name: '',
  code: '',
  address: '',
  logo: '',
  status: 'active',
};

function ToastMessage({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-600',
      title: 'Success',
    },
    error: {
      icon: XCircle,
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-800',
      iconColor: 'text-red-600',
      title: 'Error',
    },
    info: {
      icon: Info,
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
      title: 'Information',
    },
  };

  const selected = config[toast.type];
  const Icon = selected.icon;

  return (
    <div className="fixed right-5 top-5 z-50 w-[calc(100%-2rem)] max-w-md animate-[slideIn_0.25s_ease-out]">
      <div
        className={`flex gap-3 rounded-2xl border ${selected.border} ${selected.bg} p-4 shadow-2xl backdrop-blur`}
      >
        <div className={`mt-0.5 ${selected.iconColor}`}>
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${selected.text}`}>
            {selected.title}
          </p>

          <p className={`mt-0.5 text-sm ${selected.text}`}>
            {toast.message}
          </p>

          {toast.details && (
            <p className="mt-1 max-h-12 overflow-hidden text-xs text-slate-500">
              {toast.details}
            </p>
          )}

          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/70">
            <div className="h-full animate-[toastTimer_5s_linear_forwards] rounded-full bg-current opacity-40" />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(type: ToastType, message: string, details?: string) {
    setToast({ type, message, details });
  }

  async function fetchSettings() {
    setLoading(true);

    try {
      const res = await fetch('/api/admin/settings', {
        cache: 'no-store',
      });

      const data: SettingsResponse = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to load settings.');
        return;
      }

      setInstitution(data.institution);

      if (data.institution) {
        setForm({
          name: data.institution.name || '',
          code: data.institution.code || '',
          address: data.institution.address || '',
          logo: data.institution.logo || '',
          status: data.institution.status || 'active',
        });
      }
    } catch {
      showToast('error', 'Unable to load institution settings.');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();

    if (!institution) {
      showToast('error', 'No institution found to update.');
      return;
    }

    if (!form.name.trim()) {
      showToast('error', 'Institution name is required.');
      return;
    }

    if (!form.code.trim()) {
      showToast('error', 'Institution code is required.');
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institutionId: institution._id || institution.id,
          name: form.name,
          code: form.code,
          address: form.address,
          logo: form.logo,
          status: form.status,
        }),
      });

      const data: SettingsResponse = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to update settings.');
        return;
      }

      setInstitution(data.institution);

      if (data.institution) {
        setForm({
          name: data.institution.name || '',
          code: data.institution.code || '',
          address: data.institution.address || '',
          logo: data.institution.logo || '',
          status: data.institution.status || 'active',
        });
      }

      showToast(
        'success',
        'Institution settings updated successfully.',
        data.institution?.name
      );
    } catch {
      showToast('error', 'Unable to update institution settings.');
    } finally {
      setSaving(false);
    }
  }

  const statusBadge =
    form.status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : form.status === 'inactive'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div>
      {toast && (
        <ToastMessage toast={toast} onClose={() => setToast(null)} />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900">
            <Settings size={26} />
            Institution Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Settings are available only for Super Admin and Institution
            Admin/Admin.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading || saving}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="animate-spin text-slate-900" size={44} />
        </div>
      ) : !institution ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-700">
            <Info size={34} />
          </div>

          <h2 className="text-lg font-black text-slate-900">
            No institution found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Please create or assign an institution before updating settings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={saveSettings} className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Building2 size={20} />
                Institution Profile
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update institution name, code, address, logo and status.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Institution Name *
                </label>

                <input
                  className="input"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Example: Smart College"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Institution Code *
                </label>

                <input
                  className="input uppercase"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                  placeholder="Example: SMART001"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                </label>

                <select
                  className="input"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as InstitutionStatus,
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Address
                </label>

                <textarea
                  className="input min-h-28 resize-y"
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="Institution address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Logo URL
                </label>

                <input
                  className="input"
                  value={form.logo}
                  onChange={(event) =>
                    setForm({ ...form, logo: event.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusBadge}`}
              >
                {form.status}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <ShieldCheck size={20} />
                Security Defaults
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>• QR payload contains encrypted token only.</p>
                <p>• Attendance duplicate prevention is enabled per period.</p>
                <p>• Settings menu is restricted to Super Admin/Admin roles.</p>
                <p>• Student, Parent and Teacher portals cannot access settings.</p>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-black text-slate-900">
                Current Institution
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>
                  <b className="text-slate-900">Name:</b>{' '}
                  {institution.name || 'N/A'}
                </p>

                <p>
                  <b className="text-slate-900">Code:</b>{' '}
                  {institution.code || 'N/A'}
                </p>

                <p>
                  <b className="text-slate-900">Address:</b>{' '}
                  {institution.address || 'N/A'}
                </p>

                <p>
                  <b className="text-slate-900">Status:</b>{' '}
                  {institution.status || 'active'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { BellRing, Loader2, RefreshCw, Send } from 'lucide-react';

type NotificationRow = {
  _id: string;
  title?: string;
  event: string;
  type: string;
  message: string;
  status: string;
  recipientName?: string;
  recipientPhone?: string;
  createdAt: string;
};

type MasterOption = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  periodName?: string;
  startTime?: string;
  endTime?: string;
};

type MasterOptions = {
  classes: MasterOption[];
  sections: MasterOption[];
  subjects: MasterOption[];
  periods: MasterOption[];
};

const emptyOptions: MasterOptions = {
  classes: [],
  sections: [],
  subjects: [],
  periods: [],
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [options, setOptions] = useState<MasterOptions>(emptyOptions);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event: 'guardian_alert',
    type: 'sms',
    studentId: '',
    title: '',
    message: '',
    bulk: '',
    class: '',
    section: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/master-options', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load options');
      setOptions({
        classes: data.classes || [],
        sections: data.sections || [],
        subjects: data.subjects || [],
        periods: data.periods || [],
      });
    } catch {
      setOptions(emptyOptions);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
      setItems(data.notifications || []);
    } catch (error) {
      setItems([]);
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Failed to load notifications.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
    void load();
  }, [loadOptions, load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      ...form,
      bulk: form.bulk || undefined,
      studentId: form.studentId.trim() || undefined,
      title: form.title.trim() || undefined,
      message: form.message.trim() || undefined,
      class: form.class || undefined,
      section: form.section || undefined,
    };

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMessage({ ok: res.ok, text: res.ok ? `${data.count || 1} notification(s) created.` : data.error || 'Failed to create notification.' });
      if (res.ok) {
        setForm((prev) => ({ ...prev, studentId: '', title: '', message: '' }));
        await load();
      }
    } catch {
      setMessage({ ok: false, text: 'Unable to create notification.' });
    } finally {
      setSaving(false);
    }
  }

  async function markSent(id: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'sent' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update notification');
      await load();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Failed to update notification.' });
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900">
            <BellRing size={26} />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Guardian alerts, student warnings, class teacher notifications and admin exception alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <form onSubmit={submit} className="card mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
        <select className="input" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })}>
          <option value="guardian_alert">Guardian Alert</option>
          <option value="student_warning">Student Warning</option>
          <option value="class_teacher_notification">Class Teacher Notification</option>
          <option value="admin_exception_alert">Admin Exception Alert</option>
          <option value="student_absent">Student Absent</option>
          <option value="low_attendance">Low Attendance</option>
          <option value="non_collegiate_risk">Non-Collegiate Risk</option>
        </select>

        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="push">Push</option>
        </select>

        <input
          className="input"
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          placeholder="Student ID / Object ID"
        />

        <select className="input" value={form.bulk} onChange={(e) => setForm({ ...form, bulk: e.target.value })}>
          <option value="">Single Notification</option>
          <option value="absent_guardians">Bulk Absent Guardian Alert</option>
        </select>

        <select className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
          <option value="">All Classes</option>
          {options.classes.map((item) => (
            <option key={item._id || item.id || item.name} value={item.name || ''}>
              {item.name}
            </option>
          ))}
        </select>

        <select className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
          <option value="">All Sections</option>
          {options.sections.map((item) => (
            <option key={item._id || item.id || item.name} value={item.name || ''}>
              {item.name}
            </option>
          ))}
        </select>

        <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />

        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />

        <textarea className="input min-h-[92px] md:col-span-3" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Custom message" />

        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Create Alert
        </button>
      </form>

      {message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${message.ok ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b bg-slate-50 px-5 py-4 font-black">Notification Log</div>
        {loading ? (
          <div className="p-10"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No notification found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Title/Event</th><th>Recipient</th><th>Type</th><th>Status</th><th>Message</th><th>Created</th><th>Action</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td><b>{item.title || item.event}</b><div className="text-xs text-slate-500">{item.event}</div></td>
                    <td>{item.recipientName || '—'}<div className="text-xs text-slate-500">{item.recipientPhone || ''}</div></td>
                    <td>{item.type}</td>
                    <td><span className={`badge ${item.status === 'sent' ? 'badge-success' : item.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{item.status}</span></td>
                    <td className="max-w-sm">{item.message}</td>
                    <td className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                    <td><button type="button" onClick={() => markSent(item._id)} disabled={item.status === 'sent'} className="rounded-lg border px-3 py-1 text-xs font-bold disabled:opacity-50">Mark Sent</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

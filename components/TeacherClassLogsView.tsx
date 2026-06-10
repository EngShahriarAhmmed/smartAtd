'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookOpenCheck, Loader2, Plus, RefreshCw } from 'lucide-react';

type Log = {
  _id: string;
  teacherEmail?: string;
  class: string;
  section: string;
  subject: string;
  period: string;
  date: string;
  startTime: string;
  endTime?: string;
  scanCount: number;
};

type MasterOption = { _id?: string; id?: string; name?: string; code?: string; periodName?: string; startTime?: string; endTime?: string };
type MasterOptions = { classes: MasterOption[]; sections: MasterOption[]; subjects: MasterOption[]; periods: MasterOption[] };
const emptyOptions: MasterOptions = { classes: [], sections: [], subjects: [], periods: [] };

export default function TeacherClassLogsView({ admin = false }: { admin?: boolean }) {
  const [items, setItems] = useState<Log[]>([]);
  const [options, setOptions] = useState<MasterOptions>(emptyOptions);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    class: '',
    section: '',
    subject: '',
    period: '',
    teacherEmail: '',
  });

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/master-options', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load options');
      setOptions({ classes: data.classes || [], sections: data.sections || [], subjects: data.subjects || [], periods: data.periods || [] });
    } catch {
      setOptions(emptyOptions);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      Object.entries(form).forEach(([key, value]) => {
        if (value && ['date', 'class', 'section', 'subject', 'period', 'teacherEmail'].includes(key)) params.set(key, value);
      });
      const res = await fetch(`/api/teacher-class-logs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load class logs');
      setItems(data.logs || []);
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : 'Unable to load class logs.');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void loadOptions();
    void load();
  }, [loadOptions]); // form changes should not auto-submit the filter

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/teacher-class-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save class log');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save class log.');
      setLoading(false);
    }
  }

  async function endLog(id: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/teacher-class-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, endTime: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to end class log');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to end class log.');
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900">
            <BookOpenCheck size={26} />
            {admin ? 'Teacher Class Logs' : 'My Class Logs'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Period, class, subject and QR scan log for teacher classes.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <form onSubmit={save} className="card mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-7">
        <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        {admin && <input className="input" value={form.teacherEmail} onChange={(e) => setForm({ ...form, teacherEmail: e.target.value })} placeholder="Teacher email" />}

        <select className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} required>
          <option value="">Select Class</option>
          {options.classes.map((item) => <option key={item._id || item.id || item.name} value={item.name || ''}>{item.name}</option>)}
        </select>

        <select className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required>
          <option value="">Select Section</option>
          {options.sections.map((item) => <option key={item._id || item.id || item.name} value={item.name || ''}>{item.name}</option>)}
        </select>

        <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          <option value="">Select Subject</option>
          {options.subjects.map((item) => <option key={item._id || item.id || item.code || item.name} value={item.name || ''}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}
        </select>

        <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
          <option value="">Select Period</option>
          {options.periods.map((item) => <option key={item._id || item.id || item.periodName} value={item.periodName || ''}>{item.periodName}{item.startTime && item.endTime ? ` (${item.startTime}-${item.endTime})` : ''}</option>)}
        </select>

        <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add Log
        </button>
      </form>

      {message && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</div>}

      <div className="card overflow-hidden">
        <div className="border-b bg-slate-50 px-5 py-4 font-black">Class Log List</div>
        {loading ? (
          <div className="p-10"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No class logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Date</th><th>Teacher</th><th>Class</th><th>Subject</th><th>Period</th><th>Start</th><th>End</th><th>Scan Count</th><th>Action</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.date}</td>
                    <td>{item.teacherEmail || '—'}</td>
                    <td>{item.class}-{item.section}</td>
                    <td>{item.subject || 'General'}</td>
                    <td>{item.period || 'General'}</td>
                    <td>{new Date(item.startTime).toLocaleTimeString()}</td>
                    <td>{item.endTime ? new Date(item.endTime).toLocaleTimeString() : 'Running'}</td>
                    <td>{item.scanCount}</td>
                    <td><button type="button" onClick={() => endLog(item._id)} className="rounded-lg border px-3 py-1 text-xs font-bold">End</button></td>
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

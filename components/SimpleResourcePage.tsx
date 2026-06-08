'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'time' | 'select';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
};

type Column = {
  key: string;
  label: string;
  render?: (item: Record<string, unknown>) => ReactNode;
};

export default function SimpleResourcePage({
  title,
  description,
  endpoint,
  fields,
  columns,
  formTitle = 'Add New Record',
}: {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
  columns: Column[];
  formTitle?: string;
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function loadItems() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to load records' });
        setItems([]);
        return;
      }
      setItems(data.items || []);
    } catch {
      setMessage({ ok: false, text: 'Unable to load records' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to save record' });
        return;
      }
      setForm({});
      setMessage({ ok: true, text: 'Record saved successfully.' });
      await loadItems();
    } catch {
      setMessage({ ok: false, text: 'Unable to save record' });
    } finally {
      setSaving(false);
    }
  }

  function valueFor(item: Record<string, unknown>, key: string) {
    const value = item[key];
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-black text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button type="button" onClick={loadItems} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={submitForm} className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900"><Plus size={18} />{formTitle}</h2>
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-xs font-bold text-slate-600">{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'select' ? (
                  <select className="input" value={form[field.name] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))} required={field.required}>
                    <option value="">Select {field.label}</option>
                    {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input className="input" type={field.type || 'text'} value={form[field.name] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))} placeholder={field.placeholder} required={field.required} />
                )}
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Save
          </button>
        </form>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-base font-black text-slate-900">Records</h2>
            <p className="mt-1 text-sm text-slate-500">{items.length} item(s) found</p>
          </div>
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="animate-spin text-slate-900" size={42} /></div>
          ) : !items.length ? (
            <div className="flex min-h-[300px] items-center justify-center p-8 text-center text-slate-500">No records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={String(item._id || item.id)}>
                      {columns.map((column) => <td key={column.key}>{column.render ? column.render(item) : valueFor(item, column.key)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

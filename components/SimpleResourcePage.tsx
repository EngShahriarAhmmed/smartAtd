'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, Loader2, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X } from 'lucide-react';
import PaginationBar from '@/components/PaginationBar';
import { useToast } from '@/components/ToastProvider';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'time' | 'select' | 'password' | 'textarea';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  hideInEdit?: boolean;
};

type Column = {
  key: string;
  label: string;
  render?: (item: Record<string, unknown>) => ReactNode;
};

type Message = { ok: boolean; text: string } | null;

function recordId(item: Record<string, unknown>) {
  return String(item._id || item.id || '');
}

function isDeleted(item: Record<string, unknown>) {
  return !!item.deletedAt;
}

function valueFor(item: Record<string, unknown>, key: string) {
  const value = item[key];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return String(value);
}

function toFormValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  return String(value);
}

function ActionIconButton({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
        {label}
      </span>
    </button>
  );
}

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
  const [message, setMessage] = useState<Message>(null);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const toast = useToast();

  const visibleFields = fields.filter((field) => !(editing && field.hideInEdit));

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      columns.some((column) => String(item[column.key] || '').toLowerCase().includes(needle))
    );
  }, [columns, items, query]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / limit), 1);
  const pagedItems = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, limit, page, totalPages]);

  async function loadItems() {
    setLoading(true);
    setMessage(null);
    try {
      const listUrl = new URL(endpoint, window.location.origin);
      listUrl.searchParams.set('deleted', showDeleted ? 'true' : 'false');
      const res = await fetch(listUrl.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to load records' });
        setItems([]);
        return;
      }
      setItems(data.items || data.students || data.users || []);
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
  }, [endpoint, showDeleted]);

  useEffect(() => {
    setPage(1);
  }, [query, showDeleted]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!message) return;
    if (message.ok) toast.success(message.text);
    else toast.error(message.text);
  }, [message, toast]);

  function resetForm() {
    setForm({});
    setEditing(null);
  }

  function toggleForm() {
    if (showForm && !editing) {
      setShowForm(false);
      resetForm();
      return;
    }
    resetForm();
    setViewing(null);
    setShowForm(true);
  }

  function startEdit(item: Record<string, unknown>) {
    const next: Record<string, string> = {};
    fields.forEach((field) => {
      next[field.name] = toFormValue(item[field.name]);
    });
    setEditing(item);
    setViewing(null);
    setForm(next);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    resetForm();
    setShowForm(false);
  }

  function endpointFor(item: Record<string, unknown>, permanent = false) {
    const id = recordId(item);
    return `${endpoint}/${id}${permanent ? '?permanent=true' : ''}`;
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string | boolean> = {};
      visibleFields.forEach((field) => {
        const value = form[field.name];
        if (field.type === 'password' && !value) return;
        if (field.type === 'select' && (value === 'true' || value === 'false')) {
          payload[field.name] = value === 'true';
          return;
        }
        payload[field.name] = value || '';
      });

      const res = await fetch(editing ? endpointFor(editing) : endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to save record' });
        return;
      }
      resetForm();
      setShowForm(false);
      setMessage({ ok: true, text: editing ? 'Record updated successfully.' : 'Record saved successfully.' });
      await loadItems();
    } catch {
      setMessage({ ok: false, text: 'Unable to save record' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: Record<string, unknown>) {
    const name = String(item.name || item.email || item.code || item.key || recordId(item));
    const permanent = showDeleted || isDeleted(item);
    if (!window.confirm(permanent ? `Permanently delete ${name}? This cannot be undone.` : `Remove ${name}? It will move to deleted records.`)) return;
    setMessage(null);
    try {
      const res = await fetch(endpointFor(item, permanent), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to delete record' });
        return;
      }
      setMessage({ ok: true, text: data.message || (permanent ? 'Record permanently deleted.' : 'Record moved to deleted records.') });
      await loadItems();
    } catch {
      setMessage({ ok: false, text: 'Unable to delete record' });
    }
  }

  async function restoreItem(item: Record<string, unknown>) {
    const name = String(item.name || item.email || item.code || item.key || recordId(item));
    if (!window.confirm(`Restore ${name}?`)) return;
    setMessage(null);
    try {
      const res = await fetch(endpointFor(item), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to restore record' });
        return;
      }
      setMessage({ ok: true, text: data.message || 'Record restored successfully.' });
      await loadItems();
    } catch {
      setMessage({ ok: false, text: 'Unable to restore record' });
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="m-0 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowDeleted((value) => !value);
              setShowForm(false);
              resetForm();
              setViewing(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${showDeleted ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Trash2 size={16} />
            {showDeleted ? 'Show Active Data' : 'Show Deleted Data'}
          </button>

          <button
            type="button"
            onClick={loadItems}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>

          {!showDeleted && (
            <button
              type="button"
              onClick={toggleForm}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              {showForm && !editing ? <X size={16} /> : <Plus size={16} />}
              {showForm && !editing ? 'Hide Form' : formTitle}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {showForm && !showDeleted && (
        <div className="card mb-6 bg-slate-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              {editing ? <Pencil size={18} /> : <Plus size={18} />}
              {editing ? `Edit ${title}` : formTitle}
            </h2>
            <button type="button" onClick={cancelForm} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50">
              Cancel
            </button>
          </div>

          <form onSubmit={submitForm}>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {visibleFields.map((field) => (
                <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-3' : undefined}>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {field.label}{field.required ? ' *' : ''}
                  </label>
                  {field.type === 'select' ? (
                    <select className="input" value={form[field.name] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))} required={field.required}>
                      <option value="">Select {field.label}</option>
                      {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea className="input min-h-24" value={form[field.name] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))} placeholder={field.placeholder} required={field.required} />
                  ) : (
                    <input className="input" type={field.type || 'text'} value={form[field.name] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))} placeholder={field.placeholder} required={field.required} />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? 'Update Record' : 'Save Record'}
              </button>
              <button type="button" onClick={cancelForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input className="input w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." />
          </div>
          <div className="text-sm font-semibold text-slate-500">
            {filteredItems.length} of {items.length} {showDeleted ? 'deleted' : 'active'} record(s) shown
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400"><Loader2 className="mx-auto animate-spin text-slate-900" size={38} /></div>
        ) : !filteredItems.length ? (
          <div className="p-12 text-center text-slate-400">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                  {showDeleted && <th>Deleted At</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={recordId(item)}>
                    {columns.map((column) => <td key={column.key}>{column.render ? column.render(item) : valueFor(item, column.key)}</td>)}
                    {showDeleted && <td>{valueFor(item, 'deletedAt')}</td>}
                    <td>
                      <div className="flex justify-end gap-2">
                        <ActionIconButton label="View record" onClick={() => setViewing(item)} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Eye size={16} /></ActionIconButton>
                        {showDeleted ? (
                          <>
                            <ActionIconButton label="Restore record" onClick={() => restoreItem(item)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><RotateCcw size={16} /></ActionIconButton>
                            <ActionIconButton label="Permanent delete" onClick={() => deleteItem(item)} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16} /></ActionIconButton>
                          </>
                        ) : (
                          <>
                            <ActionIconButton label="Edit record" onClick={() => startEdit(item)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Pencil size={16} /></ActionIconButton>
                            <ActionIconButton label="Remove record" onClick={() => deleteItem(item)} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16} /></ActionIconButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredItems.length > 0 && (
        <PaginationBar
          pagination={{ page: Math.min(page, totalPages), limit, total: filteredItems.length, totalPages }}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
          label="records"
        />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-700">Record Details</div>
                <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
              {columns.map((column) => (
                <div key={column.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{column.label}</div>
                  <div className="mt-2 break-words text-sm font-semibold text-slate-900">
                    {column.render ? column.render(viewing) : valueFor(viewing, column.key)}
                  </div>
                </div>
              ))}
              {isDeleted(viewing) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-red-500">Deleted At</div>
                  <div className="mt-2 break-words text-sm font-semibold text-red-900">{valueFor(viewing, 'deletedAt')}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              {showDeleted ? (
                <button type="button" onClick={() => restoreItem(viewing)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
                  <RotateCcw size={16} /> Restore
                </button>
              ) : (
                <button type="button" onClick={() => startEdit(viewing)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                  <Pencil size={16} /> Edit
                </button>
              )}
              <button type="button" onClick={() => setViewing(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

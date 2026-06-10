'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, Loader2, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, X } from 'lucide-react';
import PaginationBar from '@/components/PaginationBar';
import { useToast } from '@/components/ToastProvider';

type Item = Record<string, string | boolean | undefined | null> & { _id?: string; id?: string; deletedAt?: string | null };
type ResourceType = 'class' | 'section';
type ViewState = { type: ResourceType; item: Item } | null;

const statusOptions = [
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

function itemId(item: Item) {
  return String(item._id || item.id || '');
}

function isActive(value: unknown) {
  return value === true || value === 'true';
}

function dateText(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function StatusBadge({ active }: { active: unknown }) {
  return <span className={`badge ${isActive(active) ? 'badge-success' : 'badge-danger'}`}>{isActive(active) ? 'Active' : 'Inactive'}</span>;
}

function ActionIconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}>
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
        {label}
      </span>
    </button>
  );
}

function DetailModal({ view, showDeleted, onClose, onEdit, onRestore }: { view: ViewState; showDeleted: boolean; onClose: () => void; onEdit: (type: ResourceType, item: Item) => void; onRestore: (type: ResourceType, item: Item) => void }) {
  if (!view) return null;
  const entries: [string, unknown][] = view.type === 'class'
    ? [
        ['Name', view.item.name],
        ['Code', view.item.code],
        ['Status', isActive(view.item.active) ? 'Active' : 'Inactive'],
      ]
    : [
        ['Section', view.item.name],
        ['Status', isActive(view.item.active) ? 'Active' : 'Inactive'],
      ];

  if (view.item.deletedAt) entries.push(['Deleted At', dateText(view.item.deletedAt)]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-700">{view.type === 'class' ? 'Class Details' : 'Section Details'}</div>
            <h2 className="mt-1 text-xl font-black text-slate-950">{String(view.item.name || 'Record')}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
          {entries.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-2 break-words text-sm font-semibold text-slate-900">{String(value || '—')}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {showDeleted ? (
            <button type="button" onClick={() => onRestore(view.type, view.item)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
              <RotateCcw size={16} /> Restore
            </button>
          ) : (
            <button type="button" onClick={() => onEdit(view.type, view.item)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              <Pencil size={16} /> Edit
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Item[]>([]);
  const [sections, setSections] = useState<Item[]>([]);
  const [classForm, setClassForm] = useState({ name: '', code: '', active: 'true' });
  const [sectionForm, setSectionForm] = useState({ name: '', active: 'true' });
  const [editingClass, setEditingClass] = useState<Item | null>(null);
  const [editingSection, setEditingSection] = useState<Item | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [view, setView] = useState<ViewState>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [classPage, setClassPage] = useState(1);
  const [sectionPage, setSectionPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const toast = useToast();

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const deletedParam = showDeleted ? 'true' : 'false';
      const [classRes, sectionRes] = await Promise.all([
        fetch(`/api/admin/classes?deleted=${deletedParam}`, { cache: 'no-store' }),
        fetch(`/api/admin/sections?deleted=${deletedParam}`, { cache: 'no-store' }),
      ]);
      const classData = await classRes.json();
      const sectionData = await sectionRes.json();
      if (!classRes.ok) throw new Error(classData.error || 'Failed to load classes');
      if (!sectionRes.ok) throw new Error(sectionData.error || 'Failed to load sections');
      setClasses(classData.items || []);
      setSections(sectionData.items || []);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Failed to load data' });
      setClasses([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [showDeleted]);

  useEffect(() => {
    if (!message) return;
    if (message.ok) toast.success(message.text);
    else toast.error(message.text);
  }, [message, toast]);

  useEffect(() => { setClassPage(1); setSectionPage(1); }, [query, showDeleted]);

  const filteredClasses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return classes;
    return classes.filter((item) => String(item.name || '').toLowerCase().includes(needle) || String(item.code || '').toLowerCase().includes(needle));
  }, [classes, query]);

  const filteredSections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sections;
    return sections.filter((item) => String(item.name || '').toLowerCase().includes(needle));
  }, [sections, query]);

  const classTotalPages = Math.max(Math.ceil(filteredClasses.length / limit), 1);
  const sectionTotalPages = Math.max(Math.ceil(filteredSections.length / limit), 1);
  const pagedClasses = filteredClasses.slice((Math.min(classPage, classTotalPages) - 1) * limit, (Math.min(classPage, classTotalPages) - 1) * limit + limit);
  const pagedSections = filteredSections.slice((Math.min(sectionPage, sectionTotalPages) - 1) * limit, (Math.min(sectionPage, sectionTotalPages) - 1) * limit + limit);

  function resetClassForm() {
    setEditingClass(null);
    setClassForm({ name: '', code: '', active: 'true' });
  }

  function resetSectionForm() {
    setEditingSection(null);
    setSectionForm({ name: '', active: 'true' });
  }

  function toggleClassForm() {
    if (showClassForm && !editingClass) {
      setShowClassForm(false);
      resetClassForm();
      return;
    }
    resetClassForm();
    setShowClassForm(true);
    setShowSectionForm(false);
    setView(null);
  }

  function toggleSectionForm() {
    if (showSectionForm && !editingSection) {
      setShowSectionForm(false);
      resetSectionForm();
      return;
    }
    resetSectionForm();
    setShowSectionForm(true);
    setShowClassForm(false);
    setView(null);
  }

  function editItem(type: ResourceType, item: Item) {
    setView(null);
    if (type === 'class') {
      setEditingClass(item);
      setClassForm({ name: String(item.name || ''), code: String(item.code || ''), active: String(isActive(item.active)) });
      setShowClassForm(true);
      setShowSectionForm(false);
    } else {
      setEditingSection(item);
      setSectionForm({ name: String(item.name || ''), active: String(isActive(item.active)) });
      setShowSectionForm(true);
      setShowClassForm(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveClass(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const url = editingClass ? `/api/admin/classes/${itemId(editingClass)}` : '/api/admin/classes';
    const res = await fetch(url, { method: editingClass ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...classForm, active: classForm.active === 'true' }) });
    const data = await res.json();
    if (!res.ok) { setMessage({ ok: false, text: data.error || 'Failed to save class' }); return; }
    resetClassForm();
    setShowClassForm(false);
    setMessage({ ok: true, text: editingClass ? 'Class updated successfully.' : 'Class saved successfully.' });
    await loadData();
  }

  async function saveSection(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const url = editingSection ? `/api/admin/sections/${itemId(editingSection)}` : '/api/admin/sections';
    const res = await fetch(url, { method: editingSection ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sectionForm, active: sectionForm.active === 'true' }) });
    const data = await res.json();
    if (!res.ok) { setMessage({ ok: false, text: data.error || 'Failed to save section' }); return; }
    resetSectionForm();
    setShowSectionForm(false);
    setMessage({ ok: true, text: editingSection ? 'Section updated successfully.' : 'Section saved successfully.' });
    await loadData();
  }

  async function deleteItem(type: ResourceType, item: Item) {
    const permanent = showDeleted || !!item.deletedAt;
    const name = String(item.name || 'record');
    if (!window.confirm(permanent ? `Permanently delete ${name}? This cannot be undone.` : `Remove ${name}? It will move to deleted records.`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/${type === 'class' ? 'classes' : 'sections'}/${itemId(item)}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setMessage({ ok: false, text: data.error || `Failed to delete ${type}` }); return; }
    setMessage({ ok: true, text: data.message || (permanent ? `${type} permanently deleted.` : `${type} moved to deleted records.`) });
    await loadData();
  }

  async function restoreItem(type: ResourceType, item: Item) {
    const name = String(item.name || 'record');
    if (!window.confirm(`Restore ${name}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/${type === 'class' ? 'classes' : 'sections'}/${itemId(item)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restore: true }) });
    const data = await res.json();
    if (!res.ok) { setMessage({ ok: false, text: data.error || `Failed to restore ${type}` }); return; }
    setView(null);
    setMessage({ ok: true, text: data.message || `${type} restored successfully.` });
    await loadData();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">Classes & Sections</h1>
          <p className="m-0 text-sm text-slate-500">Manage classes and independent reusable sections with view, edit, safe delete and permanent delete options.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setShowDeleted((value) => !value); setShowClassForm(false); setShowSectionForm(false); resetClassForm(); resetSectionForm(); setView(null); }} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${showDeleted ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            <Trash2 size={16} /> {showDeleted ? 'Show Active Data' : 'Show Deleted Data'}
          </button>
          <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Refresh
          </button>
          {!showDeleted && (
            <>
              <button type="button" onClick={toggleClassForm} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md">
                {showClassForm && !editingClass ? <X size={16} /> : <Plus size={16} />} {showClassForm && !editingClass ? 'Hide Class Form' : 'Add Class'}
              </button>
              <button type="button" onClick={toggleSectionForm} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md">
                {showSectionForm && !editingSection ? <X size={16} /> : <Plus size={16} />} {showSectionForm && !editingSection ? 'Hide Section Form' : 'Add Section'}
              </button>
            </>
          )}
        </div>
      </div>

      {message && <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

      {showClassForm && !showDeleted && (
        <div className="card mb-6 bg-slate-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Plus size={18}/>{editingClass ? 'Edit Class' : 'Add Class'}</h2>
            <button type="button" onClick={() => { resetClassForm(); setShowClassForm(false); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">Cancel</button>
          </div>
          <form onSubmit={saveClass}>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="input" placeholder="Class name e.g. 10" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} required />
              <input className="input" placeholder="Code e.g. CLASS-10" value={classForm.code} onChange={(e) => setClassForm({ ...classForm, code: e.target.value })} />
              <select className="input" value={classForm.active} onChange={(e) => setClassForm({ ...classForm, active: e.target.value })}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingClass ? 'Update Class' : 'Save Class'}</button>
              <button type="button" onClick={() => { resetClassForm(); setShowClassForm(false); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showSectionForm && !showDeleted && (
        <div className="card mb-6 bg-slate-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Plus size={18}/>{editingSection ? 'Edit Section' : 'Add Section'}</h2>
            <button type="button" onClick={() => { resetSectionForm(); setShowSectionForm(false); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">Cancel</button>
          </div>
          <form onSubmit={saveSection}>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="input" placeholder="Section name e.g. A" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} required />
              <select className="input" value={sectionForm.active} onChange={(e) => setSectionForm({ ...sectionForm, active: e.target.value })}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingSection ? 'Update Section' : 'Save Section'}</button>
              <button type="button" onClick={() => { resetSectionForm(); setShowSectionForm(false); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input className="input w-full pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search class or section..." />
          </div>
          <div className="text-sm font-semibold text-slate-500">{showDeleted ? 'Deleted records view' : 'Active records view'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-4 font-black">Classes</div>
          {loading ? <div className="p-8"><Loader2 className="animate-spin" /></div> : !filteredClasses.length ? <div className="p-8 text-center text-slate-400">No classes found.</div> : (
            <div className="overflow-x-auto"><table><thead><tr><th>Name</th><th>Code</th><th>Status</th>{showDeleted && <th>Deleted At</th>}<th className="text-right">Actions</th></tr></thead><tbody>{pagedClasses.map((c) => <tr key={itemId(c)}><td className="font-bold">{c.name}</td><td>{c.code || '—'}</td><td><StatusBadge active={c.active} /></td>{showDeleted && <td>{dateText(c.deletedAt)}</td>}<td><div className="flex justify-end gap-2"><ActionIconButton label="View class" onClick={() => setView({ type: 'class', item: c })} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Eye size={16}/></ActionIconButton>{showDeleted ? <><ActionIconButton label="Restore class" onClick={() => restoreItem('class', c)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><RotateCcw size={16}/></ActionIconButton><ActionIconButton label="Permanent delete" onClick={() => deleteItem('class', c)} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16}/></ActionIconButton></> : <><ActionIconButton label="Edit class" onClick={() => editItem('class', c)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Pencil size={16}/></ActionIconButton><ActionIconButton label="Remove class" onClick={() => deleteItem('class', c)} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16}/></ActionIconButton></>}</div></td></tr>)}</tbody></table></div>
          )}
          {filteredClasses.length > 0 && (
            <PaginationBar
              pagination={{ page: Math.min(classPage, classTotalPages), limit, total: filteredClasses.length, totalPages: classTotalPages }}
              onPageChange={setClassPage}
              onLimitChange={(nextLimit) => { setLimit(nextLimit); setClassPage(1); setSectionPage(1); }}
              label="classes"
            />
          )}
        </div>
        <div className="card overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-4 font-black">Sections</div>
          {loading ? <div className="p-8"><Loader2 className="animate-spin" /></div> : !filteredSections.length ? <div className="p-8 text-center text-slate-400">No sections found.</div> : (
            <div className="overflow-x-auto"><table><thead><tr><th>Section</th><th>Status</th>{showDeleted && <th>Deleted At</th>}<th className="text-right">Actions</th></tr></thead><tbody>{pagedSections.map((s) => <tr key={itemId(s)}><td className="font-bold">{s.name}</td><td><StatusBadge active={s.active} /></td>{showDeleted && <td>{dateText(s.deletedAt)}</td>}<td><div className="flex justify-end gap-2"><ActionIconButton label="View section" onClick={() => setView({ type: 'section', item: s })} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Eye size={16}/></ActionIconButton>{showDeleted ? <><ActionIconButton label="Restore section" onClick={() => restoreItem('section', s)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><RotateCcw size={16}/></ActionIconButton><ActionIconButton label="Permanent delete" onClick={() => deleteItem('section', s)} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16}/></ActionIconButton></> : <><ActionIconButton label="Edit section" onClick={() => editItem('section', s)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Pencil size={16}/></ActionIconButton><ActionIconButton label="Remove section" onClick={() => deleteItem('section', s)} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16}/></ActionIconButton></>}</div></td></tr>)}</tbody></table></div>
          )}
          {filteredSections.length > 0 && (
            <PaginationBar
              pagination={{ page: Math.min(sectionPage, sectionTotalPages), limit, total: filteredSections.length, totalPages: sectionTotalPages }}
              onPageChange={setSectionPage}
              onLimitChange={(nextLimit) => { setLimit(nextLimit); setClassPage(1); setSectionPage(1); }}
              label="sections"
            />
          )}
        </div>
      </div>

      <DetailModal view={view} showDeleted={showDeleted} onClose={() => setView(null)} onEdit={editItem} onRestore={restoreItem} />
    </div>
  );
}

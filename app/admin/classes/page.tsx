'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

type Item = Record<string, string | boolean | undefined> & { _id?: string; id?: string };

export default function ClassesPage() {
  const [classes, setClasses] = useState<Item[]>([]);
  const [sections, setSections] = useState<Item[]>([]);
  const [classForm, setClassForm] = useState({ name: '', code: '' });
  const [sectionForm, setSectionForm] = useState({ classId: '', className: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    const [classRes, sectionRes] = await Promise.all([fetch('/api/admin/classes'), fetch('/api/admin/sections')]);
    const classData = await classRes.json();
    const sectionData = await sectionRes.json();
    setClasses(classData.items || []);
    setSections(sectionData.items || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function saveClass(e: React.FormEvent) {
    e.preventDefault(); setMessage('');
    const res = await fetch('/api/admin/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classForm) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Failed to save class'); return; }
    setClassForm({ name: '', code: '' }); setMessage('Class saved successfully.'); loadData();
  }

  async function saveSection(e: React.FormEvent) {
    e.preventDefault(); setMessage('');
    const selected = classes.find((item) => item._id === sectionForm.classId || item.id === sectionForm.classId);
    const body = { ...sectionForm, className: selected?.name || sectionForm.className };
    const res = await fetch('/api/admin/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Failed to save section'); return; }
    setSectionForm({ classId: '', className: '', name: '' }); setMessage('Section saved successfully.'); loadData();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="m-0 text-2xl font-black text-slate-900">Classes & Sections</h1><p className="mt-1 text-sm text-slate-500">Manage academic classes and sections.</p></div>
        <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"><RefreshCw size={16}/>Refresh</button>
      </div>
      {message && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</div>}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5"><h2 className="mb-4 flex items-center gap-2 text-base font-black"><Plus size={18}/>Add Class</h2><form onSubmit={saveClass} className="space-y-3"><input className="input" placeholder="Class name e.g. 10" value={classForm.name} onChange={(e)=>setClassForm({...classForm,name:e.target.value})} required/><input className="input" placeholder="Code e.g. CLASS-10" value={classForm.code} onChange={(e)=>setClassForm({...classForm,code:e.target.value})}/><button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save Class</button></form></div>
        <div className="card p-5"><h2 className="mb-4 flex items-center gap-2 text-base font-black"><Plus size={18}/>Add Section</h2><form onSubmit={saveSection} className="space-y-3"><select className="input" value={sectionForm.classId} onChange={(e)=>setSectionForm({...sectionForm,classId:e.target.value})} required><option value="">Select class</option>{classes.map((c)=><option key={c._id || c.id} value={String(c._id || c.id)}>{c.name}</option>)}</select><input className="input" placeholder="Section name e.g. A" value={sectionForm.name} onChange={(e)=>setSectionForm({...sectionForm,name:e.target.value})} required/><button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save Section</button></form></div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden"><div className="border-b bg-slate-50 px-5 py-4 font-black">Classes</div>{loading?<div className="p-8"><Loader2 className="animate-spin"/></div>:<table><thead><tr><th>Name</th><th>Code</th><th>Status</th></tr></thead><tbody>{classes.map((c)=><tr key={c._id || c.id}><td className="font-bold">{c.name}</td><td>{c.code || '—'}</td><td>{c.active?'Active':'Inactive'}</td></tr>)}</tbody></table>}</div>
        <div className="card overflow-hidden"><div className="border-b bg-slate-50 px-5 py-4 font-black">Sections</div>{loading?<div className="p-8"><Loader2 className="animate-spin"/></div>:<table><thead><tr><th>Class</th><th>Section</th><th>Status</th></tr></thead><tbody>{sections.map((s)=><tr key={s._id || s.id}><td>{s.className || '—'}</td><td className="font-bold">{s.name}</td><td>{s.active?'Active':'Inactive'}</td></tr>)}</tbody></table>}</div>
      </div>
    </div>
  );
}

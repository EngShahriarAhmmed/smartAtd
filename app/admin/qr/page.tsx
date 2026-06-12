'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { IdCard, ListFilter, Loader2, QrCode, Search, Users } from 'lucide-react';
import IdCardView, { type IdCardInstitution, type IdCardStudent } from '@/components/IdCardView';
import type { Pagination } from '@/types';

type CardItem = { student: IdCardStudent; qrDataUrl: string };
type MasterOption = { _id?: string; id?: string; name?: string };
type MasterOptions = { classes: MasterOption[]; sections: MasterOption[] };
const emptyOptions: MasterOptions = { classes: [], sections: [] };

export default function StudentQRCardPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [institution, setInstitution] = useState<IdCardInstitution | null>(null);
  const [options, setOptions] = useState<MasterOptions>(emptyOptions);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const hasMinimumFilter = searchInput.trim().length > 0 || !!filterClass || !!filterSection;
  const pageSizeOptions = [10, 25, 50, 100];

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/master-options', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load options');
      setOptions({ classes: data.classes || [], sections: data.sections || [] });
    } catch {
      setOptions(emptyOptions);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  async function loadIdCards(nextPage = 1, nextLimit = pagination.limit) {
    const search = searchInput.trim();
    if (!search && !filterClass && !filterSection) {
      setMessage({ ok: false, text: 'Please select at least one filter: Search, Class, or Section.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setHasLoaded(true);
    setAppliedSearch(search);

    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', String(nextLimit));
      if (search) params.set('search', search);
      if (filterClass) params.set('class', filterClass);
      if (filterSection) params.set('section', filterSection);

      const res = await fetch(`/api/students/id-cards?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setCards([]);
        setMessage({ ok: false, text: data.error || 'Failed to generate ID cards.' });
        return;
      }

      setInstitution(data.institution || null);
      setCards(data.cards || []);
      setPagination(data.pagination || { page: nextPage, limit: nextLimit, total: 0, totalPages: 1 });
      setMessage({ ok: true, text: `${data.cards?.length || 0} ID card(s) generated.` });
    } catch {
      setCards([]);
      setMessage({ ok: false, text: 'Unable to generate ID cards.' });
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setCards([]);
    setInstitution(null);
    setSearchInput('');
    setAppliedSearch('');
    setFilterClass('');
    setFilterSection('');
    setHasLoaded(false);
    setMessage(null);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') loadIdCards(1);
  }

  function changePage(page: number) {
    if (page < 1 || page > pagination.totalPages) return;
    loadIdCards(page, pagination.limit);
  }

  function changeLimit(limit: number) {
    loadIdCards(1, limit);
  }

  async function regenerateStudentQrToken(studentId?: string, studentName?: string) {
    if (!studentId) return;
    if (!confirm(`Create a new QR token for ${studentName || 'this student'}? Old printed QR cards for this student will stop working.`)) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateQrToken: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ ok: false, text: data.error || 'Failed to create new QR token.' });
        return;
      }

      setMessage({ ok: true, text: data.message || 'New QR token created. ID card QR regenerated.' });
      await loadIdCards(pagination.page, pagination.limit);
    } catch {
      setMessage({ ok: false, text: 'Unable to create new QR token.' });
    } finally {
      setLoading(false);
    }
  }

  const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900"><IdCard size={26} />Student ID Cards</h1>
          <p className="mt-1 text-sm text-slate-500">Load students by filter and generate secure QR ID cards. QR contains encrypted token only.</p>
        </div>
        <button type="button" onClick={() => loadIdCards(1)} disabled={loading || !hasMinimumFilter} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          Load & Generate ID Cards
        </button>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input w-full pl-9 pr-24" placeholder="Search name, ID, email, roll..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleKey} disabled={loading} />
              <button type="button" onClick={() => loadIdCards(1)} disabled={loading || !hasMinimumFilter} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Load</button>
            </div>

            <select className="input w-full sm:max-w-[170px]" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} disabled={loading}>
              <option value="">All Classes</option>
              {options.classes.map((item) => <option key={item._id || item.id || item.name} value={item.name || ''}>{item.name}</option>)}
            </select>

            <select className="input w-full sm:max-w-[170px]" value={filterSection} onChange={(e) => setFilterSection(e.target.value)} disabled={loading}>
              <option value="">All Sections</option>
              {options.sections.map((item) => <option key={item._id || item.id || item.name} value={item.name || ''}>{item.name}</option>)}
            </select>

            {(searchInput || appliedSearch || filterClass || filterSection || cards.length > 0) && <button type="button" onClick={clearFilters} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">Clear</button>}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"><Users size={16}/>Generated {cards.length} card(s)</div>
        </div>
        {!hasMinimumFilter && !hasLoaded && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">Please select at least one filter: Search, Class, or Section.</div>}
        {(appliedSearch || filterClass || filterSection) && <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span className="font-bold">Loaded filter:</span>{appliedSearch && <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Search: {appliedSearch}</span>}{filterClass && <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">Class: {filterClass}</span>}{filterSection && <span className="rounded-full bg-purple-50 px-3 py-1 font-medium text-purple-700">Section: {filterSection}</span>}</div>}
      </div>

      {message && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"><h2 className="flex items-center gap-2 text-base font-black text-slate-900"><ListFilter size={18}/>Generated ID Cards</h2><p className="mt-1 text-sm text-slate-500">Front and back sides are ready for printing.</p></div>
        {loading ? <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin" size={44}/></div> : !hasLoaded ? <div className="flex min-h-[420px] items-center justify-center p-8 text-center"><div><div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-700"><IdCard size={34}/></div><p className="font-black text-slate-800">No ID card generated yet</p><p className="mt-1 text-sm text-slate-500">Select a filter and click Load & Generate ID Cards.</p></div></div> : cards.length === 0 ? <div className="p-10 text-center text-slate-500">No students found for selected filter.</div> : <div className="grid grid-cols-1 gap-2 p-5 2xl:grid-cols-2">{cards.map((card) => <div key={card.student._id || card.student.studentId} className="space-y-2"><div className="flex justify-end"><button type="button" onClick={() => regenerateStudentQrToken(card.student._id || card.student.id, card.student.name)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 shadow-sm transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"><QrCode size={14} />Create New Token & Regenerate QR</button></div><IdCardView student={card.student} institution={institution} qrDataUrl={card.qrDataUrl} compact /></div>)}</div>}
        {cards.length > 0 && <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="text-sm text-slate-600">Showing <b>{showingFrom}</b> to <b>{showingTo}</b> of <b>{pagination.total}</b> ID cards</div><div className="flex flex-wrap items-center gap-2"><button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page<=1} onClick={()=>changePage(1)}>First</button><button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page<=1} onClick={()=>changePage(pagination.page-1)}>Prev</button><span className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white">{pagination.page} / {pagination.totalPages}</span><button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page>=pagination.totalPages} onClick={()=>changePage(pagination.page+1)}>Next</button><button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page>=pagination.totalPages} onClick={()=>changePage(pagination.totalPages)}>Last</button></div><select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={pagination.limit} onChange={(e)=>changeLimit(Number(e.target.value))}>{pageSizeOptions.map((size)=><option key={size} value={size}>{size} per page</option>)}</select></div>}
      </div>
    </div>
  );
}

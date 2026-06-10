'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Download, FileBarChart, FileSpreadsheet, Loader2, ShieldAlert } from 'lucide-react';

type DailyRow = { date: string; period: string; subject: string; class: string; section: string; studentId: string; name: string; rollNumber: string; status: string; markedAt: string; markedBy: string };
type MonthlyRow = { studentId: string; name: string; rollNumber: string; class: string; section: string; present: number; late: number; absent: number; totalHeld: number; percentage: number; riskLevel: string; nonCollegiate: boolean; guardianPhone?: string };
type ReportTab = 'daily' | 'monthly' | 'non-collegiate';

type MasterOption = { _id?: string; id?: string; name?: string; code?: string; periodName?: string; startTime?: string; endTime?: string };
type MasterOptions = { classes: MasterOption[]; sections: MasterOption[]; subjects: MasterOption[]; periods: MasterOption[] };
const emptyOptions: MasterOptions = { classes: [], sections: [], subjects: [], periods: [] };

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<MasterOptions>(emptyOptions);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [dailySummary, setDailySummary] = useState<{ present: number; late: number; absent: number; total: number }[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const visibleMonthlyRows = useMemo(() => {
    return tab === 'non-collegiate' ? monthlyRows.filter((row) => row.nonCollegiate) : monthlyRows;
  }, [monthlyRows, tab]);

  useEffect(() => {
    async function loadOptions() {
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
    }

    void loadOptions();
  }, []);

  const paramsFor = useCallback((nextTab = tab) => {
    const params = new URLSearchParams();
    if (nextTab === 'daily') params.set('date', date);
    if (nextTab !== 'daily') {
      params.set('month', month);
      params.set('threshold', String(threshold));
    }
    if (cls) params.set('class', cls);
    if (section) params.set('section', section);
    if (subject) params.set('subject', subject);
    if (period) params.set('period', period);
    return params;
  }, [cls, date, month, period, section, subject, tab, threshold]);

  async function load(nextTab = tab) {
    setTab(nextTab);
    setLoading(true);
    setMessage(null);
    try {
      if (nextTab === 'daily') {
        const res = await fetch(`/api/reports/daily-period-wise?${paramsFor(nextTab)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load daily report');
        setDailyRows(data.rows || []);
        setDailySummary(data.summary || []);
      } else {
        const res = await fetch(`/api/reports/monthly?${paramsFor(nextTab)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load monthly report');
        setMonthlyRows(data.rows || []);
      }
    } catch (error) {
      setDailyRows([]);
      setMonthlyRows([]);
      setMessage(error instanceof Error ? error.message : 'Unable to load report');
    } finally {
      setLoading(false);
    }
  }

  function exportHref(formatType: 'xlsx' | 'csv' | 'pdf') {
    const report = tab === 'daily' ? 'daily' : tab === 'non-collegiate' ? 'non-collegiate' : 'monthly';
    const params = paramsFor(tab);
    params.set('report', report);
    params.set('format', formatType);
    return `/api/reports/attendance/export?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900"><FileBarChart size={26} />Attendance Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Daily period-wise report, monthly report, non-collegiate list and PDF/Excel export.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={exportHref('xlsx')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700"><FileSpreadsheet size={16} />Excel</a>
          <a href={exportHref('csv')} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"><Download size={16} />CSV</a>
          <a href={exportHref('pdf')} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"><Download size={16} />PDF/Print</a>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => load('daily')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'daily' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Daily Period-wise</button>
          <button type="button" onClick={() => load('monthly')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'monthly' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Monthly</button>
          <button type="button" onClick={() => load('non-collegiate')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'non-collegiate' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Non-Collegiate</button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          {tab === 'daily' ? <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /> : <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />}

          <select className="input" value={cls} onChange={(e) => setCls(e.target.value)}>
            <option value="">All Classes</option>
            {options.classes.map((item) => <option key={item._id || item.id || item.name} value={item.name || ''}>{item.name}</option>)}
          </select>

          <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All Sections</option>
            {options.sections.map((item) => <option key={item._id || item.id || item.name} value={item.name || ''}>{item.name}</option>)}
          </select>

          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {options.subjects.map((item) => <option key={item._id || item.id || item.code || item.name} value={item.name || ''}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}
          </select>

          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">All Periods</option>
            {options.periods.map((item) => <option key={item._id || item.id || item.periodName} value={item.periodName || ''}>{item.periodName}{item.startTime && item.endTime ? ` (${item.startTime}-${item.endTime})` : ''}</option>)}
          </select>

          {tab !== 'daily' && <input className="input" type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} placeholder="Threshold %" />}

          <button type="button" onClick={() => load(tab)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldAlert size={16} />}Load</button>
        </div>
      </div>

      {message && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</div>}

      {tab === 'daily' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Stat label="Groups" value={dailySummary.length} />
            <Stat label="Records" value={dailyRows.length} />
            <Stat label="Present" value={dailyRows.filter((r) => r.status === 'present').length} />
            <Stat label="Late" value={dailyRows.filter((r) => r.status === 'late').length} />
          </div>
          <ReportTable title="Daily Period-wise Attendance" loading={loading}>
            <thead><tr><th>Date</th><th>Period</th><th>Subject</th><th>Student</th><th>Class</th><th>Status</th><th>Marked By</th></tr></thead>
            <tbody>{dailyRows.map((row, index) => <tr key={`${row.studentId}-${index}`}><td>{row.date}</td><td>{row.period || 'General'}</td><td>{row.subject || 'General'}</td><td><b>{row.name}</b><div className="text-xs text-slate-500">{row.studentId} | Roll {row.rollNumber}</div></td><td>{row.class}-{row.section}</td><td><span className={`badge ${row.status === 'present' ? 'badge-success' : row.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>{row.status}</span></td><td>{row.markedBy}</td></tr>)}</tbody>
          </ReportTable>
        </div>
      )}

      {tab !== 'daily' && (
        <ReportTable title={tab === 'non-collegiate' ? 'Non-Collegiate / Risk List' : 'Monthly Attendance Report'} loading={loading}>
          <thead><tr><th>Student</th><th>ID</th><th>Class</th><th>Present</th><th>Late</th><th>Absent</th><th>Rate</th><th>Risk</th><th>Guardian</th></tr></thead>
          <tbody>{visibleMonthlyRows.map((row) => <tr key={row.studentId}><td className="font-bold">{row.name}<div className="text-xs text-slate-500">Roll {row.rollNumber}</div></td><td>{row.studentId}</td><td>{row.class}-{row.section}</td><td>{row.present}</td><td>{row.late}</td><td>{row.absent}</td><td>{row.percentage}%</td><td><span className={`badge ${row.nonCollegiate ? 'badge-danger' : row.percentage < 85 ? 'badge-warning' : 'badge-success'}`}>{row.riskLevel}</span></td><td>{row.guardianPhone || '—'}</td></tr>)}</tbody>
        </ReportTable>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="card p-4"><div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>;
}

function ReportTable({ title, loading, children }: { title: string; loading: boolean; children: ReactNode }) {
  return <div className="card overflow-hidden"><div className="border-b border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-900">{title}</div>{loading ? <div className="p-10 text-center"><Loader2 className="mx-auto animate-spin" /></div> : <div className="overflow-x-auto"><table>{children}</table></div>}</div>;
}

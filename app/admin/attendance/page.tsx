'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

interface AttendanceRecord {
  _id: string;
  status: 'present' | 'absent' | 'late';
  markedAt: string;
  date: string;
  studentId: { _id: string; name: string; studentId: string; class: string; section: string };
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (filterClass) params.set('class', filterClass);
    if (filterSection) params.set('section', filterSection);
    const res = await fetch(`/api/attendance/records?${params}`);
    const data = await res.json();
    setRecords(data.records || []);
    setTotalStudents(data.totalStudents || 0);
    setLoading(false);
  }, [date, filterClass, filterSection]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = totalStudents - present - late;
  const rate = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Attendance Records</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>View and filter daily attendance</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" type="date" style={{ maxWidth: 180 }} value={date} onChange={e => setDate(e.target.value)} />
        <select className="input" style={{ maxWidth: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {['6','7','8','9','10','11','12'].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
          <option value="">All Sections</option>
          {['A','B','C','D'].map(s => <option key={s} value={s}>Section {s}</option>)}
        </select>
        <button className="btn-primary" onClick={fetchRecords}>🔄 Refresh</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Present', value: present, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Late', value: late, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Absent', value: absent < 0 ? 0 : absent, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Rate', value: `${rate}%`, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading records...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <p>No attendance records for this date.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Class</th>
                <th>Status</th>
                <th>Marked At</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600 }}>{r.studentId?.name}</td>
                  <td><span className="badge badge-info">{r.studentId?.studentId}</span></td>
                  <td>{r.studentId?.class}-{r.studentId?.section}</td>
                  <td>
                    <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                      {r.status === 'present' ? '✅' : r.status === 'late' ? '⏰' : '❌'} {r.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {new Date(r.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

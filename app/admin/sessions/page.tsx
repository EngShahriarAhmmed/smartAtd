'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Session {
  _id: string; class: string; section: string; subject: string;
  date: string; startTime: string; endTime?: string;
  createdBy: string; active: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  async function fetchSessions() {
    setLoading(true);
    const res = await fetch(`/api/sessions?date=${date}`);
    const data = await res.json();
    setSessions(data.sessions || []);
    setLoading(false);
  }

  useEffect(() => { fetchSessions(); }, [date]);

  async function endSession(s: Session) {
    await fetch('/api/sessions/end', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: s._id, class: s.class, section: s.section }),
    });
    fetchSessions();
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Class Sessions</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>View all sessions and their status</p>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem' }}>
        <input className="input" type="date" style={{ maxWidth: 180 }} value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-primary" onClick={fetchSessions}>🔄 Refresh</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
            <p>No sessions found for this date.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Start</th>
                <th>End</th>
                <th>Created By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.class}-{s.section}</td>
                  <td>{s.subject}</td>
                  <td style={{ color: '#64748b' }}>{s.startTime}</td>
                  <td style={{ color: '#64748b' }}>{s.endTime || '—'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{s.createdBy}</td>
                  <td>
                    <span className={`badge ${s.active ? 'badge-success' : 'badge-info'}`}>
                      {s.active ? '🟢 Active' : '⚫ Ended'}
                    </span>
                  </td>
                  <td>
                    {s.active && (
                      <button onClick={() => endSession(s)} className="btn-danger">End</button>
                    )}
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

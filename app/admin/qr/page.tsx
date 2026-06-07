'use client';
import { useState, useEffect, useCallback } from 'react';

interface QRSession {
  id: string; qrToken: string; class: string; section: string; subject: string; date: string; startTime: string;
}

export default function QRPage() {
  const [cls, setCls] = useState('10');
  const [section, setSection] = useState('A');
  const [subject, setSubject] = useState('Mathematics');
  const [session, setSession] = useState<QRSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [ttl, setTtl] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rotating, setRotating] = useState(false);

  const classes = ['6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Bangla', 'History', 'Geography', 'ICT'];

  const refreshQR = useCallback(async () => {
    if (!session) return;
    setRotating(true);
    const res = await fetch('/api/qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class: cls, section, subject }) });
    const data = await res.json();
    setRotating(false);
    if (data.session) {
      setSession(data.session);
      setQrDataUrl(data.qrDataUrl);
      setTtl(data.expiresIn);
    }
  }, [session, cls, section, subject]);

  // Countdown timer
  useEffect(() => {
    if (!session || ttl <= 0) return;
    const interval = setInterval(() => {
      setTtl(t => {
        if (t <= 1) { refreshQR(); return 30; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, ttl, refreshQR]);

  async function startSession() {
    setLoading(true); setError('');
    const res = await fetch('/api/qr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class: cls, section, subject }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Failed'); return; }
    setSession(data.session);
    setQrDataUrl(data.qrDataUrl);
    setTtl(data.expiresIn);
  }

  async function endSession() {
    if (!session) return;
    await fetch('/api/sessions/end', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, qrToken: session.qrToken, class: cls, section }),
    });
    setSession(null); setQrDataUrl(''); setTtl(0);
  }

  const ttlPct = (ttl / 30) * 100;
  const ttlColor = ttl > 15 ? '#10b981' : ttl > 7 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>QR Code Generator</h1>
      <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>Generate a rotating QR code for students to scan and mark attendance</p>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: session ? '320px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Config Panel */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>Session Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 5, color: '#374151' }}>Class</label>
              <select className="input" value={cls} onChange={e => setCls(e.target.value)} disabled={!!session}>
                {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 5, color: '#374151' }}>Section</label>
              <select className="input" value={section} onChange={e => setSection(e.target.value)} disabled={!!session}>
                {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 5, color: '#374151' }}>Subject</label>
              <select className="input" value={subject} onChange={e => setSubject(e.target.value)} disabled={!!session}>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {!session ? (
              <button className="btn-primary" onClick={startSession} disabled={loading} style={{ marginTop: 4 }}>
                {loading ? '⏳ Starting...' : '🚀 Start Session'}
              </button>
            ) : (
              <button className="btn-danger" onClick={endSession} style={{ marginTop: 4 }}>
                ⏹ End Session
              </button>
            )}
          </div>

          {session && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, marginBottom: 4 }}>Session Active</div>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>📚 {session.subject}</div>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>🏫 Class {session.class}-{session.section}</div>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>🕐 Started {session.startTime}</div>
            </div>
          )}
        </div>

        {/* QR Display */}
        {session && qrDataUrl && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>Scan to Mark Attendance</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.8rem' }}>Class {session.class}-{session.section} • {session.subject}</p>

            {/* QR Code */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: 260, height: 260, borderRadius: 16, border: '4px solid #e2e8f0', opacity: rotating ? 0.4 : 1, transition: 'opacity 0.3s' }}
              />
              {rotating && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>🔄</div>
                </div>
              )}
            </div>

            {/* Countdown */}
            <div style={{ maxWidth: 260, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Refreshes in</span>
                <span style={{ color: ttlColor }}>{ttl}s</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ background: ttlColor, width: `${ttlPct}%`, height: '100%', borderRadius: 99, transition: 'width 1s linear, background 0.3s' }} />
              </div>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>QR code auto-rotates every 30 seconds for security</p>

            <button onClick={refreshQR} style={{ marginTop: 8, background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              🔄 Refresh Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

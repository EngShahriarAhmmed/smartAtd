'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ScanResult {
  success: boolean;
  message: string;
  studentName?: string;
  studentId?: string;
  class?: string;
  section?: string;
  status?: string;
  date?: string;
  error?: string;
}

function ScanForm() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('token') || '';
  const [studentQrToken, setStudentQrToken] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sessionToken) { setTokenValid(false); return; }
    // Check if session token is still valid
    setTokenValid(true);
  }, [sessionToken]);

  async function markAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!studentQrToken.trim()) return;
    setLoading(true); setResult(null);

    const res = await fetch('/api/attendance/mark', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, studentQrToken: studentQrToken.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(data);
  }

  if (tokenValid === false) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: '1rem' }}>❌</div>
        <h2 style={{ color: '#ef4444', fontWeight: 700 }}>Invalid QR Code</h2>
        <p style={{ color: '#64748b' }}>This QR code is invalid or has expired.<br />Ask your teacher to generate a new one.</p>
      </div>
    );
  }

  if (result) {
    const isSuccess = result.success;
    const isAlready = !result.success && !result.error;
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 70, marginBottom: '1rem' }}>
          {result.error ? '❌' : isSuccess ? (result.status === 'late' ? '⏰' : '✅') : '⚠️'}
        </div>
        <h2 style={{ color: result.error ? '#ef4444' : isSuccess ? '#10b981' : '#f59e0b', fontWeight: 700, marginBottom: '0.5rem' }}>
          {result.error ? 'Error' : isSuccess ? 'Attendance Marked!' : 'Already Marked'}
        </h2>
        <p style={{ color: '#374151', fontWeight: 600, fontSize: '1.1rem' }}>{result.studentName}</p>
        {result.status && (
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Status: <strong>{result.status}</strong> • {result.date}
          </p>
        )}
        {result.error && <p style={{ color: '#64748b' }}>{result.error}</p>}
        {(result.message && !result.error) && <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 8 }}>{result.message}</p>}

        {!isAlready && (
          <button
            onClick={() => { setResult(null); setStudentQrToken(''); }}
            className="btn-primary"
            style={{ marginTop: '1.5rem' }}
          >
            Mark Another
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 48, marginBottom: '0.5rem' }}>📱</div>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.3rem' }}>Mark Attendance</h2>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>Enter your student QR token</p>
      </div>

      <form onSubmit={markAttendance}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
            Your Student QR Token
          </label>
          <input
            className="input"
            value={studentQrToken}
            onChange={e => setStudentQrToken(e.target.value)}
            placeholder="Paste your QR token here..."
            required
            style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
          />
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
            Find your token in your student profile or scan your personal QR card
          </p>
        </div>
        <button className="btn-primary" type="submit" disabled={loading || !studentQrToken.trim()} style={{ width: '100%' }}>
          {loading ? '⏳ Marking...' : '✅ Mark Attendance'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e' }}>
          ⚠️ This QR session expires in 30 seconds. If marking fails, ask your teacher to refresh the QR.
        </p>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, background: 'white', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: 26 }}>📋</div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>QR Attendance</h1>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</div>}>
            <ScanForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Login failed'); return; }
    router.push('/admin');
  }

  async function seedDB() {
    setLoading(true);
    const res = await fetch('/api/seed', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setEmail('admin@school.com');
      setPassword('admin123');
      setError('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: 'white', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: 28 }}>📋</div>
          <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>QR Attendance</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: '0.9rem' }}>Smart School Attendance System</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Sign In</h2>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#374151' }}>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@school.com" required />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#374151' }}>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>First time? Seed the database with demo data</p>
            <button onClick={seedDB} disabled={loading} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              🌱 Seed Demo Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

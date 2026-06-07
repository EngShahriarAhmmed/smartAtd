'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
  activeSessions: number;
  recentAttendance: {
    _id: string;
    status: string;
    markedAt: string;
    studentId: { name: string; studentId: string; class: string; section: string };
  }[];
  classStats: { class: string; present: number; total: number }[];
  date: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); });
    const t = setInterval(() => {
      fetch('/api/dashboard').then(r => r.json()).then(setStats);
    }, 15000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Loading dashboard...</p>
      </div>
    </div>
  );

  if (!stats) return null;

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: '👥', color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Present Today', value: stats.presentToday, icon: '✅', color: '#10b981', bg: '#ecfdf5' },
    { label: 'Late Today', value: stats.lateToday, icon: '⏰', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Absent Today', value: stats.absentToday, icon: '❌', color: '#ef4444', bg: '#fef2f2' },
    { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: '📈', color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Active Sessions', value: stats.activeSessions, icon: '📱', color: '#0ea5e9', bg: '#f0f9ff' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            {new Date(stats.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {statCards.map(c => (
          <div key={c.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, background: c.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {c.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.color, lineHeight: 1.1 }}>{c.value}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Attendance */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Recent Attendance</h2>
          {stats.recentAttendance.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem' }}>No attendance recorded today</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recentAttendance.map(a => (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: 8, background: '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.studentId?.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      Class {a.studentId?.class}-{a.studentId?.section} • {new Date(a.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`badge ${a.status === 'present' ? 'badge-success' : a.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Class Stats */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Class-wise Attendance</h2>
          {stats.classStats.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem' }}>No classes found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.classStats.map(c => {
                const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
                return (
                  <div key={c.class}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Class {c.class}</span>
                      <span style={{ color: '#64748b' }}>{c.present}/{c.total} ({pct}%)</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8 }}>
                      <div style={{ background: pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

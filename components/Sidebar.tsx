'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/qr', label: 'Generate QR', icon: '📱' },
  { href: '/admin/students', label: 'Students', icon: '👥' },
  { href: '/admin/attendance', label: 'Attendance', icon: '✅' },
  { href: '/admin/sessions', label: 'Sessions', icon: '📅' },
];

export default function Sidebar({ userEmail, userRole }: { userEmail: string; userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside style={{
      width: 240, background: 'linear-gradient(180deg, #1e3a5f 0%, #162d4a 100%)',
      position: 'fixed', top: 0, left: 0, height: '100vh',
      display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '2rem', padding: '0 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: 24 }}>📋</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>QR Attendance</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>School System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
        <div style={{ padding: '0 0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{userRole}</div>
        </div>
        <button onClick={logout} style={{
          width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)',
          padding: '0.6rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}

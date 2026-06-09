'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronDown,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Home,
  IdCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  UserRound,
  UserCircle,
  WalletCards,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types';
import { getRoleHome, getRoleLabel } from '@/lib/role-home';
import { useEffect, useMemo, useRef, useState } from 'react';

type MenuItem = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const ROLE_MENUS: Record<UserRole, MenuSection[]> = {
  super_admin: [
    {
      title: 'Platform',
      items: [
        { href: '/super-admin', label: 'System Overview', icon: LayoutDashboard },
        { href: '/super-admin/institutions', label: 'Institutions', icon: Building2 },
        { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: WalletCards },
        { href: '/super-admin/analytics', label: 'Usage Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Control',
      items: [
        { href: '/super-admin/users', label: 'Platform Users', icon: UserCog },
        { href: '/super-admin/settings', label: 'Settings', icon: Settings },
        { href: '/account', label: 'My Account', icon: UserCircle },
      ],
    },
  ],
  institution_admin: [
    {
      title: 'Institution',
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/students', label: 'Students', icon: Users },
        { href: '/admin/teachers', label: 'Teachers', icon: UserRound },
        { href: '/admin/classes', label: 'Classes & Sections', icon: Landmark },
        { href: '/admin/subjects', label: 'Subjects', icon: GraduationCap },
        { href: '/admin/periods', label: 'Periods', icon: CalendarClock },
      ],
    },
    {
      title: 'Attendance',
      items: [
        { href: '/admin/qr', label: 'Student QR Cards', icon: QrCode },
        { href: '/admin/attendance', label: 'Attendance Records', icon: ClipboardCheck },
        { href: '/admin/sessions', label: 'Class Sessions', icon: CalendarClock },
        { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
        { href: '/admin/corrections', label: 'Corrections', icon: ShieldCheck },
      ],
    },
    {
      title: 'System',
      items: [{ href: '/admin/settings', label: 'Institution Settings', icon: Settings }, { href: '/account', label: 'My Account', icon: UserCircle }],
    },
  ],
  admin: [
    {
      title: 'Administration',
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/students', label: 'Students', icon: Users },
        { href: '/admin/teachers', label: 'Teachers', icon: UserRound },
        { href: '/admin/classes', label: 'Classes & Sections', icon: Landmark },
        { href: '/admin/subjects', label: 'Subjects', icon: GraduationCap },
        { href: '/admin/periods', label: 'Periods', icon: CalendarClock },
        { href: '/admin/qr', label: 'Student QR Cards', icon: QrCode },
        { href: '/admin/attendance', label: 'Attendance Records', icon: ClipboardCheck },
        { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
      ],
    },
    {
      title: 'System',
      items: [{ href: '/admin/settings', label: 'Institution Settings', icon: Settings }, { href: '/account', label: 'My Account', icon: UserCircle }],
    },
  ],
  teacher: [
    {
      title: 'Teaching',
      items: [
        { href: '/teacher', label: 'Teacher Dashboard', icon: LayoutDashboard },
        { href: '/teacher/scanner', label: 'QR Scanner', icon: ScanLine },
        { href: '/teacher/classes', label: 'My Classes', icon: GraduationCap },
        { href: '/teacher/attendance', label: 'Attendance History', icon: ClipboardList },
        { href: '/teacher/reports', label: 'Subject Reports', icon: FileBarChart },
        { href: '/account', label: 'My Account', icon: UserCircle },
      ],
    },
  ],
  student: [
    {
      title: 'Student Portal',
      items: [
        { href: '/student', label: 'My Dashboard', icon: LayoutDashboard },
        { href: '/student/attendance', label: 'Attendance %', icon: BarChart3 },
        { href: '/student/subjects', label: 'Subject-wise Report', icon: GraduationCap },
        { href: '/student/id-card', label: 'ID Card', icon: IdCard },
        { href: '/student/history', label: 'History', icon: ClipboardList },
        { href: '/account', label: 'My Account', icon: UserCircle },
      ],
    },
  ],
  parent: [
    {
      title: 'Parent Portal',
      items: [
        { href: '/parent', label: 'Parent Dashboard', icon: LayoutDashboard },
        { href: '/parent/attendance', label: 'Child Attendance', icon: BarChart3 },
        { href: '/parent/alerts', label: 'Absence Alerts', icon: MessageSquareWarning },
        { href: '/parent/reports', label: 'Reports', icon: FileBarChart },
        { href: '/account', label: 'My Account', icon: UserCircle },
      ],
    },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === '/admin' || href === '/teacher' || href === '/student' || href === '/parent' || href === '/super-admin') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RoleBasedShell({
  userEmail,
  userRole,
  institutionName,
  children,
}: {
  userEmail: string;
  userRole: UserRole;
  institutionName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; email?: string; phone?: string; role?: string; active?: boolean } | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const menu = ROLE_MENUS[userRole] || ROLE_MENUS.admin;
  const roleLabel = getRoleLabel(userRole);
  const home = getRoleHome(userRole);

  const currentPage = useMemo(() => {
    for (const section of menu) {
      const found = section.items.find((item) => isActive(pathname, item.href));
      if (found) return found.label;
    }
    if (pathname.startsWith('/account')) return 'My Account';
    return 'Dashboard';
  }, [menu, pathname]);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401) {
          router.replace('/login?expired=1');
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => setProfile(data?.user || null))
      .catch(() => setProfile(null));
  }, [router]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const ignoredAuthPaths = [
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isApiRequest = url.includes('/api/');
      const isIgnoredAuthRequest = ignoredAuthPaths.some((path) => url.includes(path));

      if (response.status === 401 && isApiRequest && !isIgnoredAuthRequest) {
        await originalFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        router.replace('/login?expired=1');
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white/95 shadow-2xl shadow-slate-200/70 backdrop-blur transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <Link href={home} className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20">
              <QrCode size={23} />
            </div>
            <div>
              <div className="text-sm font-black leading-tight text-slate-950">Smart QR</div>
              <div className="text-xs font-semibold text-slate-500">Attendance System</div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {menu.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                          active ? 'bg-white/15 text-white' : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:text-blue-600'
                        }`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{roleLabel}</div>
                <h1 className="text-base font-black text-slate-900 sm:text-lg">{currentPage}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={home}
                className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
              >
                <Home size={15} />
                Home
              </Link>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <UserCircle size={17} />
                  </span>
                  <span className="hidden max-w-[160px] truncate md:block">{profile?.name || userEmail}</span>
                  <ChevronDown size={15} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
                    <div className="border-b border-slate-200 bg-gradient-to-br from-slate-900 to-blue-900 p-5 text-white">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><UserCircle /></div>
                      <div className="truncate text-base font-black">{profile?.name || 'User'}</div>
                      <div className="truncate text-xs text-blue-100">{profile?.email || userEmail}</div>
                      <div className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">{roleLabel}</div>
                    </div>
                    <div className="space-y-2 p-3">
                      <Link href="/account" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
                        <UserCog size={17} /> User Info & Change Password
                      </Link>
                      <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50">
                        <LogOut size={17} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

const NAV = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: '📊' },
  { href: '/approvals', label: 'อนุมัติรายการ', icon: '✅' },
  { href: '/products', label: 'สินค้า', icon: '💊' },
  { href: '/stores', label: 'ร้านยา', icon: '🏥' },
  { href: '/users', label: 'ผู้ใช้งาน', icon: '👤' },
];

const TITLES: Record<string, string> = {
  '/dashboard': 'แดชบอร์ด',
  '/approvals': 'อนุมัติรายการ',
  '/products': 'จัดการสินค้า',
  '/stores': 'จัดการร้านยา',
  '/users': 'จัดการผู้ใช้งาน',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) return <div style={{ padding: 40 }} className="muted">กำลังโหลด…</div>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          ระบบฝากขาย OTC
          <small>Admin Panel</small>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={pathname === n.href ? 'active' : ''}>
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="who">
          <b>{user.fullName}</b>
          {user.role}
        </div>
        <button className="btn sm" style={{ marginTop: 8 }} onClick={logout}>
          ออกจากระบบ
        </button>
      </aside>
      <div className="main">
        <div className="topbar">{TITLES[pathname] ?? 'OTC'}</div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

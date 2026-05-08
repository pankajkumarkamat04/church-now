'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  CircleUserRound,
  X,
  CreditCard,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Wallet,
} from 'lucide-react';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';
import { BrandIdentity } from '@/components/branding/BrandIdentity';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AppFooter } from '@/components/layout/AppFooter';

export function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessMemberPortal(user)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user || !canAccessMemberPortal(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
          <p className="text-sm text-neutral-500">Loading your account…</p>
        </div>
      </div>
    );
  }

  const overviewActive = pathname === '/dashboard/member';
  const paymentsActive = pathname === '/dashboard/member/payments';
  const accountActive = pathname === '/dashboard/member/account';
  const financeRecordsActive = pathname === '/dashboard/member/finance';
  const councilsActive = pathname === '/dashboard/member/councils';
  const announcementsActive = pathname === '/dashboard/member/announcements';

  const itemClass = (active: boolean) =>
    `group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
      active
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm'
        : 'border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900'
    }`;

  const mainMenuItems = [
    { href: '/dashboard/member', label: 'Dashboard', icon: LayoutDashboard, active: overviewActive },
    { href: '/dashboard/member/account', label: 'My Account', icon: CircleUserRound, active: accountActive },
    { href: '/dashboard/member/finance', label: 'My Records', icon: Wallet, active: financeRecordsActive },
    { href: '/dashboard/member/payments', label: 'Payments', icon: CreditCard, active: paymentsActive },
    { href: '/dashboard/member/councils', label: 'Councils', icon: Layers, active: councilsActive },
    { href: '/dashboard/member/announcements', label: 'Announcements', icon: Megaphone, active: announcementsActive },
  ];

  const sidebarContent = (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm lg:border-0 lg:p-0 lg:shadow-none">
      <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-3">
          <BrandIdentity
            wrapperClassName="flex min-w-0 items-center"
            logoClassName="size-12 rounded-md object-cover ring-1 ring-neutral-200"
            textClassName="truncate text-sm font-semibold text-neutral-900"
          />
        </div>
        <p className="truncate text-sm font-semibold text-neutral-900">{user.fullName || 'Member'}</p>
        <p className="truncate text-xs text-neutral-500">{user.email}</p>
      </div>
      <div className="mb-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Main menu</p>
      </div>
      <nav className="space-y-1.5">
        {mainMenuItems.map((item) => (
          <Link key={item.href} href={item.href} className={itemClass(item.active)}>
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
        {user.role === 'ADMIN' ? (
          <Link href="/dashboard/admin" className={itemClass(pathname.startsWith('/dashboard/admin'))}>
            <Briefcase className="size-4 shrink-0" />
            Church Admin Panel
          </Link>
        ) : null}
      </nav>
      <div className="mt-5 border-t border-neutral-100 pt-4 space-y-2">
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-neutral-100 text-neutral-900">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-neutral-900/30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      {mobileNavOpen ? (
        <aside className="fixed inset-y-0 left-0 z-30 w-[88vw] max-w-80 overflow-y-auto border-r border-neutral-200 bg-white p-4 shadow-sm lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900">Menu</p>
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
          {sidebarContent}
        </aside>
      ) : null}
      <header className="relative z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="shrink-0 rounded-lg p-2.5 text-neutral-700 hover:bg-neutral-100 lg:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/" className="truncate">
              <BrandIdentity
                wrapperClassName="flex min-w-0 items-center"
                logoClassName="size-12 rounded-md object-cover ring-1 ring-neutral-200"
                textClassName="truncate text-lg font-bold text-emerald-600 sm:text-xl"
              />
            </Link>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard/member/account"
              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 sm:px-3 sm:text-sm"
            >
              <span className="sm:hidden">Account</span>
              <span className="hidden sm:inline">My Account</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            {sidebarContent}
          </aside>
          <section className="dashboard-content min-w-0 lg:col-span-9">{children}</section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

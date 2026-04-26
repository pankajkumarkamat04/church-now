'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  CircleUserRound,
  CreditCard,
  HandCoins,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Wallet,
  X,
} from 'lucide-react';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

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
  const subscriptionsActive = pathname === '/dashboard/member/subscriptions';
  const tithesActive = pathname === '/dashboard/member/tithes';
  const donationsActive = pathname === '/dashboard/member/donations';
  const accountActive = pathname === '/dashboard/member/account';
  const financeRecordsActive = pathname === '/dashboard/member/finance';
  const councilsActive = pathname === '/dashboard/member/councils';
  const announcementsActive = pathname === '/dashboard/member/announcements';

  const itemClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      active
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
    }`;

  return (
    <div className="min-h-screen w-full min-w-0 bg-neutral-100 text-neutral-900">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-neutral-900/30 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
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
            <Link href="/" className="truncate text-lg font-bold text-emerald-600 sm:text-xl">
              ChurchNow
            </Link>
          </div>
          <div className="shrink-0">
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

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-12">
          <aside
            className={`relative z-30 lg:col-span-3 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}
          >
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-neutral-100 pb-4">
                <p className="truncate text-sm font-semibold text-neutral-900">{user.fullName || 'Member'}</p>
                <p className="truncate text-xs text-neutral-500">{user.email}</p>
              </div>
              <nav className="space-y-1">
                <Link href="/dashboard/member" className={itemClass(overviewActive)}>
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
                <Link href="/dashboard/member/account" className={itemClass(accountActive)}>
                  <CircleUserRound className="size-4" />
                  My Account
                </Link>
                <Link href="/dashboard/member/finance" className={itemClass(financeRecordsActive)}>
                  <Wallet className="size-4" />
                  My records
                </Link>
                <Link href="/dashboard/member/subscriptions" className={itemClass(subscriptionsActive)}>
                  <CreditCard className="size-4" />
                  Subscription
                </Link>
                <Link href="/dashboard/member/councils" className={itemClass(councilsActive)}>
                  <Layers className="size-4" />
                  Councils
                </Link>
                <Link href="/dashboard/member/announcements" className={itemClass(announcementsActive)}>
                  <Megaphone className="size-4" />
                  Announcements
                </Link>
                <Link href="/dashboard/member/tithes" className={itemClass(tithesActive)}>
                  <HandCoins className="size-4" />
                  Tithes
                </Link>
                <Link href="/dashboard/member/donations" className={itemClass(donationsActive)}>
                  <HandCoins className="size-4" />
                  Donations
                </Link>
                {user.role === 'ADMIN' ? (
                  <Link
                    href="/dashboard/admin"
                    className={itemClass(pathname.startsWith('/dashboard/admin'))}
                  >
                    <Briefcase className="size-4" />
                    Church admin
                  </Link>
                ) : null}
              </nav>
              <div className="mt-4 border-t border-neutral-100 pt-4 space-y-2">
                <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                  <Home className="size-4" />
                  Main website
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.replace('/login');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>
          <section className="min-w-0 lg:col-span-9">{children}</section>
        </div>
      </main>

      <footer className="mt-10 bg-slate-900 text-slate-200">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 text-center text-xs sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Church OS</p>
        </div>
      </footer>
    </div>
  );
}

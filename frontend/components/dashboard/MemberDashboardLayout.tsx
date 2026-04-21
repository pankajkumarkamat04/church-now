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
  Menu,
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
  const accountActive = pathname === '/dashboard/member/account';
  const councilsActive = pathname === '/dashboard/member/councils';

  const itemClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      active
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
    }`;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/" className="text-xl font-bold text-emerald-600">
              ChurchNow
            </Link>
            <nav className="hidden items-center gap-6 pl-6 text-sm text-neutral-600 md:flex">
              <Link href="/" className="hover:text-neutral-900">
                Home
              </Link>
              <Link href="/dashboard/member" className="hover:text-neutral-900">
                Dashboard
              </Link>
              <Link href="/dashboard/member/subscriptions" className="hover:text-neutral-900">
                Subscription
              </Link>
              <Link href="/dashboard/member/councils" className="hover:text-neutral-900">
                Councils
              </Link>
              <Link href="/dashboard/member/tithes" className="hover:text-neutral-900">
                Tithes
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/member/account"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              My Account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className={`lg:col-span-3 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
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
                <Link href="/dashboard/member/subscriptions" className={itemClass(subscriptionsActive)}>
                  <CreditCard className="size-4" />
                  Subscription
                </Link>
                <Link href="/dashboard/member/councils" className={itemClass(councilsActive)}>
                  <Layers className="size-4" />
                  Councils
                </Link>
                <Link href="/dashboard/member/tithes" className={itemClass(tithesActive)}>
                  <HandCoins className="size-4" />
                  Tithes
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
          <section className="lg:col-span-9">{children}</section>
        </div>
      </main>

      <footer className="mt-10 bg-slate-900 text-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Church OS</p>
          <p className="text-slate-300">Member dashboard</p>
        </div>
      </footer>
    </div>
  );
}

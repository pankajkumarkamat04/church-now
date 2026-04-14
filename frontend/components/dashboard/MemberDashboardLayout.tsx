'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Church,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  X,
} from 'lucide-react';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';

export function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const churchSlug =
    user?.church && typeof user.church === 'object' && user.church && 'slug' in user.church
      ? String((user.church as { slug?: string }).slug || '')
      : null;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'MEMBER') {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user || user.role !== 'MEMBER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
          <p className="text-sm text-neutral-500">Loading your account…</p>
        </div>
      </div>
    );
  }

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium transition-colors ${
      active ? 'text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
    }`;

  const overviewActive = pathname === '/dashboard/member';

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Link
              href="/dashboard/member"
              className="flex shrink-0 items-center gap-2 text-neutral-900"
            >
              <span className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                <Church className="size-4 text-neutral-700" aria-hidden />
              </span>
              <span className="hidden font-semibold tracking-tight sm:inline">Member portal</span>
            </Link>

            <nav className="hidden items-center gap-8 md:flex" aria-label="Member">
              <Link
                href="/dashboard/member"
                className={`inline-flex items-center gap-2 ${navLinkClass(overviewActive)}`}
              >
                <LayoutDashboard className="size-4 opacity-70" aria-hidden />
                Overview
              </Link>
              {churchSlug ? (
                <Link
                  href={`/${churchSlug}`}
                  className={`inline-flex items-center gap-2 ${navLinkClass(false)}`}
                >
                  <Package className="size-4 opacity-70" aria-hidden />
                  Church site
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden max-w-[200px] truncate text-right sm:block">
              <p className="truncate text-sm font-medium text-neutral-900">
                {user.fullName || 'Member'}
              </p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="hidden items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 sm:inline-flex"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Member mobile">
              <Link
                href="/dashboard/member"
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                onClick={() => setMobileNavOpen(false)}
              >
                Overview
              </Link>
              {churchSlug ? (
                <Link
                  href={`/${churchSlug}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Church site
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-800"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</div>
      </main>

      <footer className="mt-auto border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-neutral-900">
                <Church className="size-5 text-neutral-600" aria-hidden />
                <span className="font-semibold">Member portal</span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
                Manage your profile and stay connected with your church—similar to a storefront
                account dashboard, tuned for members.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Quick links
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/dashboard/member" className="text-neutral-600 hover:text-neutral-900">
                    Overview
                  </Link>
                </li>
                {churchSlug ? (
                  <li>
                    <Link href={`/${churchSlug}`} className="text-neutral-600 hover:text-neutral-900">
                      Public church site
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link href="/" className="text-neutral-600 hover:text-neutral-900">
                    Home
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Account
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/forgot-password" className="text-neutral-600 hover:text-neutral-900">
                    Reset password
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-neutral-200 pt-8 text-xs text-neutral-500 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} Church OS · Member area</p>
            <p className="text-neutral-400">Secure member dashboard</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

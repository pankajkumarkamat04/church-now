'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  CircleUserRound,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';
import { CONFERENCE_LEADER_PANEL_PATH } from '@/lib/dashboardRouting';
import { BrandIdentity } from '@/components/branding/BrandIdentity';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AppFooter } from '@/components/layout/AppFooter';

/**
 * Separate dashboard shell for conference leadership (distinct from member / church admin / superadmin).
 */
export function ConferenceLeaderDashboardLayout({ children }: { children: React.ReactNode }) {
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
    if (!user.isConferenceLeader) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user || !user.isConferenceLeader) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-2 border-neutral-300 border-t-indigo-700 dark:border-neutral-600 dark:border-t-indigo-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading conference leadership…</p>
        </div>
      </div>
    );
  }

  const overviewActive = pathname === CONFERENCE_LEADER_PANEL_PATH;

  const itemClass = (active: boolean) =>
    `group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
      active
        ? 'border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-100 dark:shadow-indigo-950/40'
        : 'border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-100'
    }`;

  const rolesSummary =
    Array.isArray(user.conferenceLeadership) && user.conferenceLeadership.length > 0
      ? user.conferenceLeadership
          .flatMap((c) => c.roles?.map((r) => r.label) || [])
          .slice(0, 4)
          .join(', ')
      : '';

  const sidebarContent = (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:lg:bg-transparent">
      <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/80 p-3 dark:border-indigo-900/70 dark:bg-indigo-950/50">
        <div className="mb-3">
          <BrandIdentity
            wrapperClassName="flex min-w-0 items-center"
            logoClassName="size-12 rounded-md object-cover ring-1 ring-indigo-200 dark:ring-indigo-800"
            textClassName="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100"
          />
        </div>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
          Conference leadership
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.fullName || 'Leader'}</p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
        {rolesSummary ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-indigo-900/90 dark:text-indigo-200/90">{rolesSummary}</p>
        ) : null}
      </div>
      <div className="mb-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Panel menu</p>
      </div>
      <nav className="space-y-1.5">
        <Link href={CONFERENCE_LEADER_PANEL_PATH} className={itemClass(overviewActive)}>
          <Landmark className="size-4 shrink-0" />
          Conference overview
        </Link>
        {canAccessMemberPortal(user) ? (
          <Link href="/dashboard/member" className={itemClass(pathname.startsWith('/dashboard/member'))}>
            <CircleUserRound className="size-4 shrink-0" />
            Member portal
          </Link>
        ) : null}
        {user.role === 'ADMIN' ? (
          <Link href="/dashboard/admin" className={itemClass(pathname.startsWith('/dashboard/admin'))}>
            <Briefcase className="size-4 shrink-0" />
            Church admin
          </Link>
        ) : null}
      </nav>
      <div className="mt-5 border-t border-neutral-100 pt-4 space-y-2 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/40"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-neutral-900/30 backdrop-blur-[1px] dark:bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      {mobileNavOpen ? (
        <aside className="fixed inset-y-0 left-0 z-30 w-[88vw] max-w-80 overflow-y-auto border-r border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-950 lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Menu</p>
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
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
                logoClassName="size-12 rounded-md object-cover ring-1 ring-indigo-100 dark:ring-indigo-800"
                textClassName="truncate text-lg font-bold text-indigo-700 dark:text-indigo-300 sm:text-xl"
              />
            </Link>
            <span className="hidden rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 sm:inline-block">
              Conference leader
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href={CONFERENCE_LEADER_PANEL_PATH}
              className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 dark:shadow-indigo-950/50 sm:px-3 sm:text-sm"
            >
              <span className="hidden sm:inline">Overview</span>
              <LayoutDashboard className="size-4 sm:hidden" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">{sidebarContent}</aside>
          <section className="dashboard-content min-w-0 lg:col-span-9">{children}</section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

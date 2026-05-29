'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasTreasurerPrivileges } from './_lib/treasurer-shared';

const NAV = [
  { href: '/dashboard/admin/payments', label: 'Overview', match: 'exact' as const },
  { href: '/dashboard/admin/finance/global-payments', label: 'Global payments', match: 'prefix' as const, requiresTreasurer: true },
  { href: '/dashboard/admin/payments/balance', label: 'Balances & deposits', match: 'prefix' as const, requiresTreasurer: true },
  { href: '/dashboard/admin/payments/on-behalf', label: 'Pay on behalf', match: 'prefix' as const, requiresTreasurer: true },
  { href: '/dashboard/admin/payments/history', label: 'History', match: 'prefix' as const },
  { href: '/dashboard/admin/payments/categories', label: 'Payment types', match: 'prefix' as const, requiresTreasurer: true },
] as const;

export default function AdminPaymentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const canManagePayments = hasTreasurerPrivileges(user);
  const visibleNav = NAV.filter((tab) => !('requiresTreasurer' in tab) || !tab.requiresTreasurer || canManagePayments);

  function isActive(tab: (typeof visibleNav)[number]): boolean {
    if (tab.match === 'exact') return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  }

  return (
    <div className="dashboard-page w-full min-w-0 space-y-5">
      <div className="page-header-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            Payments
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Treasurer tools: manage payment types, fund wallets, pay on behalf, and review history.
            {!canManagePayments ? (
              <span className="mt-1 block text-neutral-500 dark:text-neutral-500">
                Only Treasurer or Vice Treasurer can manage payment types, deposits, and pay on behalf.
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800" aria-label="Payments sections">
          {visibleNav.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? 'rounded-lg bg-violet-100 px-3 py-2 text-sm font-medium text-violet-900'
                    : 'rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100'
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

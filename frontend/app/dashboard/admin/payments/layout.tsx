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
    <div className="w-full min-w-0 max-w-6xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Treasurer tools: manage payment types, fund wallets, pay on behalf, and review history.
        {!canManagePayments ? (
          <span className="mt-1 block text-neutral-500">
            Only Treasurer or Vice Treasurer can manage payment types, deposits, and pay on behalf.
          </span>
        ) : null}
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 border-b border-neutral-200 pb-3" aria-label="Payments sections">
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
      <div className="mt-6">{children}</div>
    </div>
  );
}

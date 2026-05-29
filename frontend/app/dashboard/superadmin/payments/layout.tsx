'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SuperadminFinanceReadOnlyBanner } from '@/components/finance/SuperadminFinanceReadOnlyBanner';

const NAV = [
  { href: '/dashboard/superadmin/payments', label: 'Overview', match: 'exact' as const },
  { href: '/dashboard/superadmin/payments/deposits', label: 'Balance deposits', match: 'prefix' as const },
  { href: '/dashboard/superadmin/payments/records', label: 'Payment allocations', match: 'prefix' as const },
  { href: '/dashboard/superadmin/payments/history', label: 'Full history', match: 'prefix' as const },
] as const;

export default function SuperadminPaymentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === '/dashboard/superadmin/payments';

  function isActive(tab: (typeof NAV)[number]): boolean {
    if (tab.match === 'exact') return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  }

  return (
    <div className="dashboard-page w-full min-w-0 space-y-5">
      <div className="page-header-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
          Payments
        </h1>
      </div>
      <SuperadminFinanceReadOnlyBanner />
      {!isOverview ? (
        <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800" aria-label="Payments sections">
          {NAV.map((tab) => {
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
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

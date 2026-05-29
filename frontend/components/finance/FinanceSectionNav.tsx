'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SuperadminFinanceReadOnlyBanner } from '@/components/finance/SuperadminFinanceReadOnlyBanner';
import { financeNavItems, isFinanceNavItemActive, type FinanceNavVariant } from '@/lib/financeNav';

export function FinanceSectionNav({ variant }: { variant: FinanceNavVariant }) {
  const pathname = usePathname();
  const links = financeNavItems(variant);

  return (
    <>
      {variant === 'superadmin' ? <SuperadminFinanceReadOnlyBanner /> : null}
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
      {links.map((item) => {
        const active = isFinanceNavItemActive(pathname, item.href, variant);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? variant === 'admin'
                  ? 'bg-sky-100 text-sky-900'
                  : 'bg-violet-100 text-violet-900'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      </nav>
    </>
  );
}

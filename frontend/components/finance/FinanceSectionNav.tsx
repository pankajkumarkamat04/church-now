'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminLinks: Array<{ href: string; label: string }> = [
  { href: '/dashboard/admin/finance', label: 'Overview' },
  { href: '/dashboard/admin/finance/reports', label: 'Reports' },
  { href: '/dashboard/admin/payments', label: 'Payments' },
  { href: '/dashboard/admin/finance/expenses', label: 'Expenses' },
];

const superadminLinks: Array<{ href: string; label: string }> = [
  { href: '/dashboard/superadmin/finance', label: 'Overview' },
  { href: '/dashboard/superadmin/finance/reports', label: 'Reports' },
  { href: '/dashboard/superadmin/payments', label: 'Payments' },
  { href: '/dashboard/superadmin/finance/expenses', label: 'Expenses' },
];

type Variant = 'admin' | 'superadmin';

export function FinanceSectionNav({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  const links = variant === 'admin' ? adminLinks : superadminLinks;

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
      {links.map((item) => {
        const overviewHref = `/dashboard/${variant}/finance`;
        const active =
          item.href === overviewHref
            ? pathname === overviewHref
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
  );
}

export type FinanceNavVariant = 'admin' | 'superadmin';

export type FinanceNavItem = { href: string; label: string };

const adminFinanceNav: FinanceNavItem[] = [
  { href: '/dashboard/admin/finance', label: 'Overview' },
  { href: '/dashboard/admin/finance/reports', label: 'Reports' },
  { href: '/dashboard/admin/finance/global-payments', label: 'Global Payments' },
  { href: '/dashboard/admin/finance/ledger', label: 'Ledger' },
  { href: '/dashboard/admin/finance/cashbook', label: 'Cash Book' },
  { href: '/dashboard/admin/finance/budget', label: 'Budget' },
  { href: '/dashboard/admin/payments', label: 'Payments' },
  { href: '/dashboard/admin/finance/remittances', label: 'Remittances' },
  { href: '/dashboard/admin/finance/procurement', label: 'Procurement' },
  { href: '/dashboard/admin/finance/expenses', label: 'Expenses' },
  { href: '/dashboard/admin/finance/assets', label: 'Assets' },
];

const superadminFinanceNav: FinanceNavItem[] = [
  { href: '/dashboard/superadmin/finance', label: 'Overview' },
  { href: '/dashboard/superadmin/finance/reports', label: 'Reports' },
  { href: '/dashboard/superadmin/finance/global-payments', label: 'Global Payments' },
  { href: '/dashboard/superadmin/finance/ledger', label: 'Ledger' },
  { href: '/dashboard/superadmin/finance/cashbook', label: 'Cash Book' },
  { href: '/dashboard/superadmin/finance/budget', label: 'Budget' },
  { href: '/dashboard/superadmin/finance/remittances', label: 'Remittances' },
  { href: '/dashboard/superadmin/finance/procurement', label: 'Procurement' },
  { href: '/dashboard/superadmin/payments', label: 'Payments' },
  { href: '/dashboard/superadmin/finance/expenses', label: 'Expenses' },
  { href: '/dashboard/superadmin/finance/assets', label: 'Assets' },
];

export function financeNavItems(variant: FinanceNavVariant): FinanceNavItem[] {
  return variant === 'admin' ? adminFinanceNav : superadminFinanceNav;
}

export function financeOverviewHref(variant: FinanceNavVariant): string {
  return `/dashboard/${variant}/finance`;
}

/** Active state for finance sidebar / sub-nav links. */
export function isFinanceNavItemActive(pathname: string, href: string, variant: FinanceNavVariant): boolean {
  const overview = financeOverviewHref(variant);
  if (href === overview) return pathname === overview;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isFinanceSectionActive(pathname: string, variant: FinanceNavVariant): boolean {
  const prefix = `/dashboard/${variant}/finance`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`/dashboard/${variant}/payments`);
}

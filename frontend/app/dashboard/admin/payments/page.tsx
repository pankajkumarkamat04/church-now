'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HandCoins, History, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasTreasurerPrivileges } from './_lib/treasurer-shared';

const TILES = [
  {
    href: '/dashboard/admin/payments/balance',
    title: 'Balances & deposits',
    description: 'Deposit funds into member or church-admin wallets and review live balances.',
    icon: Wallet,
    requiresTreasurer: true,
  },
  {
    href: '/dashboard/admin/payments/on-behalf',
    title: 'Pay on behalf',
    description: 'Allocate tithes and offerings from someone’s balance when they pay cash or need help.',
    icon: HandCoins,
    requiresTreasurer: true,
  },
  {
    href: '/dashboard/admin/payments/history',
    title: 'History',
    description: 'See all deposits and payment allocations for your congregation.',
    icon: History,
    requiresTreasurer: false,
  },
] as const;

export default function AdminPaymentsOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const canManagePayments = hasTreasurerPrivileges(user);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  if (!user || user.role !== 'ADMIN') return null;
  const visibleTiles = TILES.filter((tile) => !tile.requiresTreasurer || canManagePayments);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleTiles.map(({ href, title, description, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700 transition group-hover:bg-violet-200">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="mt-3 text-base font-semibold text-neutral-900">{title}</span>
          <span className="mt-1 flex-1 text-sm leading-relaxed text-neutral-600">{description}</span>
          <span className="mt-4 text-sm font-medium text-violet-700 group-hover:text-violet-900">
            Open →
          </span>
        </Link>
      ))}
    </div>
  );
}

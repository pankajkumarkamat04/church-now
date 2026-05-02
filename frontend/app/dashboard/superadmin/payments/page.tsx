'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HandCoins, History, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const TILES = [
  {
    href: '/dashboard/superadmin/payments/deposits',
    title: 'Balance deposits',
    description: 'Treasurer wallet funding events across every church (audit trail).',
    icon: Wallet,
  },
  {
    href: '/dashboard/superadmin/payments/records',
    title: 'Payment allocations',
    description: 'Tithes and offerings allocated from member balances (member self-pay and treasurer on behalf).',
    icon: HandCoins,
  },
  {
    href: '/dashboard/superadmin/payments/history',
    title: 'Full history',
    description: 'Deposits and payment rows together for a single chronological overview.',
    icon: History,
  },
] as const;

export default function SuperadminPaymentsOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TILES.map(({ href, title, description, icon: Icon }) => (
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

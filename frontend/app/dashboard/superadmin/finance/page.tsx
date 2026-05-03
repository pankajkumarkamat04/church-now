'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

type Summary = {
  byCurrency: Record<
    string,
    { payments: number; expenses: number; incomeTotal: number; net: number }
  >;
  counts: { payments: number; expenses: number };
};

export default function SuperadminFinanceOverviewPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const s = await apiFetch<Summary>('/api/superadmin/finance/summary', { token });
    setSummary(s);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  const primary = summary?.byCurrency?.USD || Object.values(summary?.byCurrency || {})[0];

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Overview</h1>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!summary ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-violet-600" />
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">Income (est.)</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">
              {primary ? `USD ${primary.incomeTotal.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">Expenses</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">
              {primary ? `USD ${primary.expenses.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">Net</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-800">
              {primary ? `USD ${primary.net.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">Records</p>
            <p className="mt-1 text-sm text-neutral-700">
              Payments {summary.counts.payments} · Expenses {summary.counts.expenses}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/superadmin/finance/reports"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Reports</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/superadmin/finance/expenses"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Expenses</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/superadmin/payments"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Payments</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/superadmin/finance/assets"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Assets</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

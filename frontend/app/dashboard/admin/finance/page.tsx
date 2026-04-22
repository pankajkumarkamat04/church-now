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
    { tithes: number; donations: number; subscriptions: number; expenses: number; incomeTotal: number; net: number }
  >;
  counts: { tithes: number; donations: number; subscriptions: number; expenses: number };
};

export default function AdminFinanceOverviewPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const s = await apiFetch<Summary>('/api/admin/finance/summary', { token });
    setSummary(s);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  if (!user || user.role !== 'ADMIN') return null;

  const primary = summary?.byCurrency?.USD || Object.values(summary?.byCurrency || {})[0];

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tithes, subscription payments, donations, and expenses for your church.
        </p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!summary ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-sky-600" />
        </div>
      ) : (
        <>
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
                Tithes {summary.counts.tithes} · Subs {summary.counts.subscriptions} · Donations {summary.counts.donations} ·
                Expenses {summary.counts.expenses}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/admin/finance/reports"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Reports</span>
          <span className="mt-1 text-sm text-neutral-600">Date ranges and totals by currency</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/admin/finance/expenses"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Expenses</span>
          <span className="mt-1 text-sm text-neutral-600">Record and track church spending</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/admin/subscriptions"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Subscriptions</span>
          <span className="mt-1 text-sm text-neutral-600">Member subscription payments</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/admin/tithes"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Tithes</span>
          <span className="mt-1 text-sm text-neutral-600">Tithe payment records</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link
          href="/dashboard/admin/donations"
          className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
        >
          <span className="text-sm font-semibold text-neutral-900">Donations</span>
          <span className="mt-1 text-sm text-neutral-600">All donations to your church</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

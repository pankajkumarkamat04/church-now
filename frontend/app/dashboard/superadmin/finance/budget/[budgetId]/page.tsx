'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBudgetById, formatUsd, refreshBudgetActuals } from '@/lib/accounting';
import type { Budget } from '@/lib/accountingTypes';

export default function SuperadminBudgetDetailPage() {
  const params = useParams();
  const budgetId = String(params.budgetId || '');
  const searchParams = useSearchParams();
  const churchId = searchParams.get('churchId') || '';
  const ownerType = searchParams.get('ownerType') || '';
  const ownerId = searchParams.get('ownerId') || '';
  const owner =
    ownerType && ownerId
      ? { ownerType, ownerId }
      : churchId
        ? { ownerType: 'CHURCH', ownerId: churchId }
        : undefined;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !budgetId || !owner) return;
    setBusy(true);
    setErr(null);
    try {
      const row = await fetchBudgetById(token, budgetId, 'superadmin', undefined, owner);
      setBudget(row);
      await refreshBudgetActuals(token, budgetId, 'superadmin', undefined, owner);
      const refreshed = await fetchBudgetById(token, budgetId, 'superadmin', undefined, owner);
      setBudget(refreshed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load budget');
    } finally {
      setBusy(false);
    }
  }, [token, budgetId, owner?.ownerType, owner?.ownerId]);

  useEffect(() => {
    if (!loading && (!user || !['SUPERADMIN', 'CHURCH_ADMIN'].includes(user.role))) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (token && budgetId && owner) void load();
  }, [token, budgetId, load, owner]);

  return (
    <div className="dashboard-page w-full min-w-0">
      <FinanceSectionNav variant="superadmin" />
      <Link href="/dashboard/superadmin/finance/budget" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to budgets
      </Link>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!owner ? (
        <p className="mt-4 text-sm text-neutral-600">Missing owner context. Open this budget from the budget list.</p>
      ) : null}
      {budget ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold">{budget.name}</h1>
          <p className="text-sm text-neutral-600">
            {budget.year} · {budget.period} · {budget.status}
            {budget.ownerType ? ` · ${budget.ownerType}` : ''}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">Income actual: {formatUsd(budget.totalActualIncome)}</div>
            <div className="rounded-xl border p-4">Expense actual: {formatUsd(budget.totalActualExpense)}</div>
            <div className="rounded-xl border p-4">Income budget: {formatUsd(budget.totalIncomeBudget)}</div>
            <div className="rounded-xl border p-4">Expense budget: {formatUsd(budget.totalExpenseBudget)}</div>
          </div>
        </>
      ) : null}
      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !budgetId) return;
    setBusy(true);
    try {
      const row = await fetchBudgetById(token, budgetId, 'superadmin', churchId || undefined);
      setBudget(row);
      if (churchId) await refreshBudgetActuals(token, budgetId, 'superadmin', churchId);
    } finally {
      setBusy(false);
    }
  }, [token, budgetId, churchId]);

  useEffect(() => {
    if (!loading && (!user || !['SUPERADMIN', 'CHURCH_ADMIN'].includes(user.role))) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (token && budgetId) load();
  }, [token, budgetId, load]);

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      {budget ? (
        <>
          <h1 className="text-2xl font-semibold">{budget.name}</h1>
          <p className="text-sm text-neutral-600">{budget.year} · {budget.period} · {budget.status}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">Income actual: {formatUsd(budget.totalActualIncome)}</div>
            <div className="rounded-xl border p-4">Expense actual: {formatUsd(budget.totalActualExpense)}</div>
          </div>
        </>
      ) : null}
      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}
    </div>
  );
}

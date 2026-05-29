'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import {
  activateBudget,
  approveBudget,
  fetchBudgetById,
  formatUsd,
  refreshBudgetActuals,
  updateBudget,
} from '@/lib/accounting';
import type { Budget, BudgetCategory } from '@/lib/accountingTypes';
import { hasTreasurerPrivileges } from '@/app/dashboard/admin/payments/_lib/treasurer-shared';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminBudgetDetailPage() {
  const params = useParams();
  const budgetId = String(params.budgetId || '');
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newIncomeAmt, setNewIncomeAmt] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newExpenseAmt, setNewExpenseAmt] = useState('');
  const canManage = hasTreasurerPrivileges(user);

  const load = useCallback(async () => {
    if (!token || !budgetId) return;
    const row = await fetchBudgetById(token, budgetId, 'admin');
    setBudget(row);
  }, [token, budgetId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token && budgetId) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load budget'));
    }
  }, [user, token, budgetId, load]);

  async function saveCategories(next: Partial<Budget>) {
    if (!token || !budget || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await updateBudget(token, budget._id, {
        incomeCategories: next.incomeCategories ?? budget.incomeCategories,
        expenseCategories: next.expenseCategories ?? budget.expenseCategories,
      });
      setBudget(updated);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function addIncomeRow() {
    if (!budget || !newIncomeCat.trim()) return;
    const row: BudgetCategory = {
      category: newIncomeCat.trim().toUpperCase(),
      budgetedAmount: Number(newIncomeAmt || 0),
      actualAmount: 0,
      variance: 0,
    };
    saveCategories({ incomeCategories: [...budget.incomeCategories, row] });
    setNewIncomeCat('');
    setNewIncomeAmt('');
  }

  function addExpenseRow() {
    if (!budget || !newExpenseCat.trim()) return;
    const row: BudgetCategory = {
      category: newExpenseCat.trim(),
      budgetedAmount: Number(newExpenseAmt || 0),
      actualAmount: 0,
      variance: 0,
    };
    saveCategories({ expenseCategories: [...budget.expenseCategories, row] });
    setNewExpenseCat('');
    setNewExpenseAmt('');
  }

  async function onRefreshActuals() {
    if (!token || !budget) return;
    setBusy(true);
    try {
      const updated = await refreshBudgetActuals(token, budget._id, 'admin');
      setBudget(updated);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Refresh failed');
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    if (!token || !budget || !canManage) return;
    setBusy(true);
    try {
      await approveBudget(token, budget._id);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Approve failed');
    } finally {
      setBusy(false);
    }
  }

  async function onActivate() {
    if (!token || !budget || !canManage) return;
    setBusy(true);
    try {
      await activateBudget(token, budget._id);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Activate failed');
    } finally {
      setBusy(false);
    }
  }

  if (!budget && !err) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-4">
        <Link href="/dashboard/admin/finance/budget" className="text-sm text-sky-700 hover:underline">← Back to budgets</Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{budget?.name}</h1>
          <p className="text-sm text-neutral-600">{budget?.year} · {budget?.period} · {budget?.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefreshActuals} disabled={busy} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">Refresh actuals</button>
          {canManage && budget?.status === 'Draft' ? (
            <button type="button" onClick={onApprove} disabled={busy} className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700">Approve</button>
          ) : null}
          {canManage && budget?.status === 'Approved' ? (
            <button type="button" onClick={onActivate} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">Activate</button>
          ) : null}
        </div>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      {budget ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Net budget</p><p className="text-xl font-semibold">{formatUsd(budget.netBudget)}</p></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Net actual</p><p className="text-xl font-semibold">{formatUsd(budget.netActual)}</p></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Income actual</p><p className="text-xl font-semibold text-emerald-800">{formatUsd(budget.totalActualIncome)}</p></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Expense actual</p><p className="text-xl font-semibold text-red-800">{formatUsd(budget.totalActualExpense)}</p></div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold">Income categories</h2>
              <p className="mb-3 text-xs text-neutral-500">Use payment type codes (TITHE, BUILDING, etc.) for automatic actuals.</p>
              <div className="space-y-2">
                {budget.incomeCategories.map((cat) => (
                  <div key={cat.category} className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                    <span>{cat.category}</span>
                    <span>{formatUsd(cat.budgetedAmount)} / {formatUsd(cat.actualAmount)}</span>
                  </div>
                ))}
              </div>
              {canManage ? (
                <div className="mt-3 flex gap-2">
                  <input className={field} placeholder="Category (e.g. TITHE)" value={newIncomeCat} onChange={(e) => setNewIncomeCat(e.target.value)} />
                  <input className={`${field} max-w-[120px]`} type="number" placeholder="Amount" value={newIncomeAmt} onChange={(e) => setNewIncomeAmt(e.target.value)} />
                  <button type="button" onClick={addIncomeRow} className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white">Add</button>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold">Expense categories</h2>
              <p className="mb-3 text-xs text-neutral-500">Match expense category labels for automatic actuals.</p>
              <div className="space-y-2">
                {budget.expenseCategories.map((cat) => (
                  <div key={cat.category} className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                    <span>{cat.category}</span>
                    <span>{formatUsd(cat.budgetedAmount)} / {formatUsd(cat.actualAmount)}</span>
                  </div>
                ))}
              </div>
              {canManage ? (
                <div className="mt-3 flex gap-2">
                  <input className={field} placeholder="Category" value={newExpenseCat} onChange={(e) => setNewExpenseCat(e.target.value)} />
                  <input className={`${field} max-w-[120px]`} type="number" placeholder="Amount" value={newExpenseAmt} onChange={(e) => setNewExpenseAmt(e.target.value)} />
                  <button type="button" onClick={addExpenseRow} className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white">Add</button>
                </div>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

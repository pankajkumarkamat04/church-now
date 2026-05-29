'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import { createBudget, fetchBudgets, formatUsd } from '@/lib/accounting';
import { BUDGET_PERIODS, type Budget } from '@/lib/accountingTypes';
import { hasTreasurerPrivileges } from '@/app/dashboard/admin/payments/_lib/treasurer-shared';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminBudgetPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    year: String(new Date().getFullYear()),
    period: 'Annual' as Budget['period'],
    description: '',
  });
  const canManage = hasTreasurerPrivileges(user);

  const load = useCallback(async () => {
    if (!token) return;
    const rows = await fetchBudgets(token, 'admin');
    setBudgets(rows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load budgets'));
    }
  }, [user, token, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      await createBudget(token, {
        name: form.name.trim(),
        year: Number(form.year),
        period: form.period,
        description: form.description,
        incomeCategories: [],
        expenseCategories: [],
      });
      setShowCreate(false);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create budget');
    } finally {
      setBusy(false);
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-800';
      case 'Approved': return 'bg-sky-100 text-sky-800';
      case 'Closed': return 'bg-red-100 text-red-800';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  }

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Accounting</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">Budget</h1>
          <p className="mt-1 text-sm text-neutral-600">Plan income and expenses; actuals pull from payments and posted expenses.</p>
        </div>
        {canManage ? (
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            <Plus className="size-4" /> Create budget
          </button>
        ) : null}
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="grid gap-4">
        {budgets.map((budget) => (
          <Link
            key={budget._id}
            href={`/dashboard/admin/finance/budget/${budget._id}`}
            className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{budget.name}</h2>
                <p className="text-sm text-neutral-600">{budget.year} · {budget.period}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(budget.status)}`}>{budget.status}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-neutral-500">Income budget</p>
                <p className="font-medium">{formatUsd(budget.totalIncomeBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Income actual</p>
                <p className="font-medium text-emerald-800">{formatUsd(budget.totalActualIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Expense budget</p>
                <p className="font-medium">{formatUsd(budget.totalExpenseBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Net actual</p>
                <p className="font-medium">{formatUsd(budget.netActual)}</p>
              </div>
            </div>
          </Link>
        ))}
        {budgets.length === 0 && !busy ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
            No budgets yet. Create one to plan congregation finances.
          </p>
        ) : null}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onCreate} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Create budget</h3>
            <div className="mt-4 space-y-3">
              <input className={field} placeholder="Budget name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className={field} type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              <select className={field} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as Budget['period'] })}>
                {BUDGET_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <textarea className={field} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50">Create</button>
            </div>
          </form>
        </div>
      ) : null}

      {busy ? <div className="mt-4 flex justify-center"><Loader2 className="size-6 animate-spin text-sky-600" /></div> : null}
    </div>
  );
}

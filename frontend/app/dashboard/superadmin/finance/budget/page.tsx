'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import {
  BudgetOwnerFilter,
  type BudgetOwnerSelection,
} from '@/components/finance/BudgetOwnerFilter';
import { useAuth } from '@/contexts/AuthContext';
import { createBudget, fetchBudgets, formatUsd } from '@/lib/accounting';
import type { Budget } from '@/lib/accountingTypes';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminBudgetPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [owner, setOwner] = useState<BudgetOwnerSelection | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    year: String(new Date().getFullYear()),
    period: 'Annual' as Budget['period'],
    description: '',
  });

  const load = useCallback(async () => {
    if (!token || !owner) {
      setBudgets([]);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      setBudgets(await fetchBudgets(token, 'superadmin', undefined, undefined, owner));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load budgets');
    } finally {
      setBusy(false);
    }
  }, [token, owner]);

  useEffect(() => {
    if (!loading && (!user || !['SUPERADMIN', 'CHURCH_ADMIN'].includes(user.role))) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (token && owner) void load();
  }, [token, owner, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !owner) return;
    setBusy(true);
    setErr(null);
    try {
      await createBudget(
        token,
        {
          name: form.name.trim(),
          year: Number(form.year),
          period: form.period,
          description: form.description,
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          incomeCategories: [],
          expenseCategories: [],
        },
        'superadmin'
      );
      setShowCreate(false);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create budget');
    } finally {
      setBusy(false);
    }
  }

  const detailHref = (id: string) => {
    if (!owner) return '#';
    const q = new URLSearchParams({
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
    });
    return `/dashboard/superadmin/finance/budget/${id}?${q.toString()}`;
  };

  return (
    <div className="dashboard-page w-full min-w-0">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Budget</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create and view budgets for congregations, councils, council regions, conferences, or national level.
          </p>
        </div>
        {owner ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            <Plus className="size-4" />
            Create budget
          </button>
        ) : null}
      </div>

      <BudgetOwnerFilter token={token} value={owner} onChange={setOwner} />

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      {!owner ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-neutral-800">Select a budget owner to continue</p>
          <p className="mt-1 text-sm text-neutral-600">
            Choose owner type and unit above, then create or open a budget for that scope.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => (
            <Link
              key={b._id}
              href={detailHref(b._id)}
              className="block rounded-xl border bg-white p-4 hover:border-violet-300"
            >
              <p className="font-semibold">{b.name}</p>
              <p className="text-sm text-neutral-600">
                {b.year} · {b.status} · Net {formatUsd(b.netActual)}
              </p>
            </Link>
          ))}
          {!busy && budgets.length === 0 ? (
            <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
              No budgets for this owner yet. Use Create budget to start a draft for the selected fiscal year.
            </p>
          ) : null}
        </div>
      )}

      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}

      {showCreate && owner ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onCreate} className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Create budget</h2>
            <p className="text-xs text-neutral-500">
              Owner: {owner.ownerType} · {owner.ownerId}
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={field}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Year</label>
                <input
                  required
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Period</label>
                <select
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as Budget['period'] }))}
                  className={field}
                >
                  <option value="Annual">Annual</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={field}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

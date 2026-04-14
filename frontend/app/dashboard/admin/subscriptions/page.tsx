'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Plan = {
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
};

type RowSubscription = {
  _id: string;
  status: string;
  user?: { email?: string; fullName?: string };
  plan?: { name?: string; monthlyPrice?: number; currency?: string };
  createdAt?: string;
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';
const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

export default function AdminSubscriptionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<RowSubscription[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [p, s] = await Promise.all([
      apiFetch<Plan[]>('/api/admin/subscriptions/plans', { token }),
      apiFetch<RowSubscription[]>('/api/admin/subscriptions', { token }),
    ]);
    setPlans(p);
    setSubscriptions(s);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setMonthlyPrice('0');
    setCurrency('USD');
    setIsActive(true);
  }

  function editPlan(plan: Plan) {
    setEditingId(plan._id);
    setName(plan.name);
    setDescription(plan.description || '');
    setMonthlyPrice(String(plan.monthlyPrice));
    setCurrency(plan.currency || 'USD');
    setIsActive(plan.isActive !== false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        description,
        monthlyPrice: Number(monthlyPrice),
        currency: currency.trim().toUpperCase(),
        isActive,
      };
      if (!body.name) throw new Error('Plan name is required');
      if (editingId) {
        await apiFetch(`/api/admin/subscriptions/plans/${editingId}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/api/admin/subscriptions/plans', {
          method: 'POST',
          token,
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to save plan');
    } finally {
      setBusy(false);
    }
  }

  async function removePlan(id: string) {
    if (!token || !window.confirm('Delete this plan? Active subscriptions will be cancelled.')) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/subscriptions/plans/${id}`, { method: 'DELETE', token });
      if (editingId === id) resetForm();
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to delete plan');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Subscriptions</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Monthly plans
        </h1>
        <p className="mt-1 text-sm text-neutral-600">Create monthly plans that members can subscribe to.</p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Plans</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-600">
                    <th className="px-4 py-2 font-medium">Plan</th>
                    <th className="px-4 py-2 font-medium">Monthly price</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-800">
                  {plans.map((plan) => (
                    <tr key={plan._id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium">{plan.name}</p>
                        {plan.description ? <p className="text-xs text-neutral-500">{plan.description}</p> : null}
                      </td>
                      <td className="px-4 py-2">
                        {plan.currency} {plan.monthlyPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">{plan.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" className={btn} onClick={() => editPlan(plan)}>
                            <Pencil className="mr-1 size-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
                            onClick={() => removePlan(plan._id)}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {plans.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No plans yet.</p> : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Member subscriptions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-600">
                    <th className="px-4 py-2 font-medium">Member</th>
                    <th className="px-4 py-2 font-medium">Plan</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-800">
                  {subscriptions.map((sub) => (
                    <tr key={sub._id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2">{sub.user?.fullName || sub.user?.email || '—'}</td>
                      <td className="px-4 py-2">{sub.plan?.name || '—'}</td>
                      <td className="px-4 py-2">{sub.status}</td>
                      <td className="px-4 py-2 text-neutral-600">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subscriptions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No subscriptions yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-sm font-semibold text-neutral-900">
            {editingId ? 'Edit plan' : 'Create monthly plan'}
          </h2>
          <form className="mt-4 space-y-3" onSubmit={onSave}>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Plan name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${field} min-h-[72px]`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Monthly price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                className={field}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={field} />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 rounded border-neutral-300" />
              Active
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingId ? 'Update plan' : 'Create plan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

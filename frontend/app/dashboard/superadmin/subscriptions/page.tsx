'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PlanRow = {
  _id: string;
  name: string;
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
  church?: { name?: string };
};

type SubscriptionRow = {
  _id: string;
  status: string;
  church?: { name?: string };
  user?: { fullName?: string; email?: string };
  plan?: { name?: string; monthlyPrice?: number; currency?: string };
  startDate?: string;
  renewalDate?: string;
};

export default function SuperadminSubscriptionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);

  async function removePlan(id: string) {
    if (!token || !window.confirm('Delete this plan? Active subscriptions on this plan will be cancelled.')) {
      return;
    }
    setErr(null);
    setBusyDeleteId(id);
    try {
      await apiFetch(`/api/superadmin/subscriptions/plans/${id}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete plan');
    } finally {
      setBusyDeleteId(null);
    }
  }

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [p, s] = await Promise.all([
      apiFetch<PlanRow[]>('/api/superadmin/subscriptions/plans', { token }),
      apiFetch<SubscriptionRow[]>('/api/superadmin/subscriptions', { token }),
    ]);
    setPlans(p);
    setSubscriptions(s);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Subscriptions</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Platform subscription monitor
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Track monthly plans and member subscriptions across all churches.
        </p>
      </div>
      <div className="mb-4">
        <Link
          href="/dashboard/superadmin/subscriptions/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
        >
          <Plus className="size-4" aria-hidden />
          Create plan
        </Link>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Total plans</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">{plans.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Total subscriptions</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">{subscriptions.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Active subscriptions</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">{activeCount}</p>
        </div>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Plans by church</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="px-4 py-2 font-medium">Church</th>
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Monthly price</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-neutral-800">
                {plans.map((plan) => (
                  <tr key={plan._id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2">{plan.church?.name || '—'}</td>
                    <td className="px-4 py-2 font-medium">{plan.name}</td>
                    <td className="px-4 py-2">
                      {plan.currency} {plan.monthlyPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">{plan.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/dashboard/superadmin/subscriptions/${plan._id}/edit`}
                          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                        >
                          <Pencil className="mr-1 size-3.5" aria-hidden />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => removePlan(plan._id)}
                          disabled={busyDeleteId === plan._id}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="mr-1 size-3.5" aria-hidden />
                          {busyDeleteId === plan._id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plans.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No plans found.</p> : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Member subscriptions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="px-4 py-2 font-medium">Church</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Start</th>
                  <th className="px-4 py-2 font-medium">Renewal</th>
                </tr>
              </thead>
              <tbody className="text-neutral-800">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2">{sub.church?.name || '—'}</td>
                    <td className="px-4 py-2">{sub.user?.fullName || sub.user?.email || '—'}</td>
                    <td className="px-4 py-2">{sub.plan?.name || '—'}</td>
                    <td className="px-4 py-2">{sub.status}</td>
                    <td className="px-4 py-2">{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">
                      {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {subscriptions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">No subscriptions found.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

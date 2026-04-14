'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Plan = {
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  currency: string;
};

type ActiveSubscription = {
  _id: string;
  status: string;
  startDate?: string;
  renewalDate?: string;
  plan?: Plan;
};

export default function MemberSubscriptionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [active, setActive] = useState<ActiveSubscription | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [busyCancel, setBusyCancel] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [p, s] = await Promise.all([
      apiFetch<Plan[]>('/api/member/subscriptions/plans', { token }),
      apiFetch<ActiveSubscription | null>('/api/member/subscriptions/me', { token }),
    ]);
    setPlans(p);
    setActive(s);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'MEMBER')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'MEMBER' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function subscribe(planId: string) {
    if (!token) return;
    setErr(null);
    setBusyPlanId(planId);
    try {
      await apiFetch('/api/member/subscriptions/subscribe', {
        method: 'POST',
        token,
        body: JSON.stringify({ planId }),
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to subscribe');
    } finally {
      setBusyPlanId(null);
    }
  }

  async function cancel() {
    if (!token || !window.confirm('Cancel your active subscription?')) return;
    setErr(null);
    setBusyCancel(true);
    try {
      await apiFetch('/api/member/subscriptions/cancel', {
        method: 'POST',
        token,
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to cancel');
    } finally {
      setBusyCancel(false);
    }
  }

  if (!user || user.role !== 'MEMBER') return null;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Subscriptions</h1>
        <p className="mt-1 text-sm text-neutral-600">Choose a monthly church plan and manage your subscription.</p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Current subscription</h2>
        {active && active.status === 'ACTIVE' ? (
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <p>
              <span className="font-medium">{active.plan?.name}</span> - {active.plan?.currency}{' '}
              {active.plan?.monthlyPrice?.toFixed(2)} / month
            </p>
            <p>Started: {active.startDate ? new Date(active.startDate).toLocaleDateString() : '—'}</p>
            <p>Next renewal: {active.renewalDate ? new Date(active.renewalDate).toLocaleDateString() : '—'}</p>
            <button
              type="button"
              disabled={busyCancel}
              onClick={cancel}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {busyCancel ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Cancel subscription
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">No active subscription.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Available monthly plans</h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan._id} className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-base font-semibold text-neutral-900">{plan.name}</h3>
              {plan.description ? <p className="mt-1 text-sm text-neutral-600">{plan.description}</p> : null}
              <p className="mt-3 text-sm font-medium text-neutral-900">
                {plan.currency} {plan.monthlyPrice.toFixed(2)} / month
              </p>
              <button
                type="button"
                disabled={busyPlanId === plan._id}
                onClick={() => subscribe(plan._id)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {busyPlanId === plan._id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Subscribe
              </button>
            </article>
          ))}
          {plans.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-neutral-500">No subscription plans available yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

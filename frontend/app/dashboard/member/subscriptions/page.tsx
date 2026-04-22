'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type ActiveSubscription = {
  _id: string;
  status: string;
  startDate?: string;
  renewalDate?: string;
  monthlyPrice?: number;
  currency?: string;
  createdAt?: string;
  cancelledAt?: string;
};

export default function MemberSubscriptionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState<ActiveSubscription | null>(null);
  const [history, setHistory] = useState<ActiveSubscription[]>([]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [busyPay, setBusyPay] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [s, h] = await Promise.all([
      apiFetch<ActiveSubscription | null>('/api/member/subscriptions/me', { token }),
      apiFetch<ActiveSubscription[]>('/api/member/subscriptions/history', { token }),
    ]);
    setActive(s);
    setHistory(h);
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessMemberPortal(user)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && canAccessMemberPortal(user) && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function paySubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusyPay(true);
    try {
      await apiFetch('/api/member/subscriptions/subscribe', {
        method: 'POST',
        token,
        body: JSON.stringify({ amount: Number(amount), currency }),
      });
      setAmount('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to pay subscription');
    } finally {
      setBusyPay(false);
    }
  }

  if (!user || !canAccessMemberPortal(user)) return null;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Subscriptions</h1>
        <p className="mt-1 text-sm text-neutral-600">Pay a subscription to your church and see your full payment history here.</p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Current subscription</h2>
        {active && active.status === 'ACTIVE' ? (
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <p>
              <span className="font-medium">Latest payment:</span> {active.currency || 'USD'}{' '}
              {Number(active.monthlyPrice || 0).toFixed(2)}
            </p>
            <p>Started: {active.startDate ? new Date(active.startDate).toLocaleDateString() : '—'}</p>
            <p>Next renewal: {active.renewalDate ? new Date(active.renewalDate).toLocaleDateString() : '—'}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">No subscription payment yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-neutral-900">Pay subscription</h2>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={paySubscription}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busyPay}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {busyPay ? <Loader2 className="size-4 animate-spin" /> : null}
            Pay subscription
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">All subscription records</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Active and past payments you made at this church.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-600">
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2 font-medium">Renewal</th>
                <th className="px-4 py-2 font-medium">Ended</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 text-neutral-800">
                    {row.currency || 'USD'} {Number(row.monthlyPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{row.status}</td>
                  <td className="px-4 py-2 text-neutral-600">
                    {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">
                    {row.renewalDate ? new Date(row.renewalDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">
                    {row.cancelledAt ? new Date(row.cancelledAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No subscription payments yet.</p>
        ) : null}
      </section>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type SubscriptionRow = {
  _id: string;
  status: string;
  church?: { name?: string };
  user?: { fullName?: string; email?: string };
  monthlyPrice?: number;
  currency?: string;
  startDate?: string;
  renewalDate?: string;
};

export default function SuperadminSubscriptionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const s = await apiFetch<SubscriptionRow[]>('/api/superadmin/subscriptions', { token });
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
          Track member subscription payments across all churches.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
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
            <h2 className="text-sm font-semibold text-neutral-900">Member subscriptions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="px-4 py-2 font-medium">Church</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
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
                    <td className="px-4 py-2">
                      {sub.currency || 'USD'} {Number(sub.monthlyPrice || 0).toFixed(2)}
                    </td>
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

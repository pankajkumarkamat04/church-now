'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type RowSubscription = {
  _id: string;
  status: string;
  user?: { email?: string; fullName?: string };
  monthlyPrice?: number;
  currency?: string;
  createdAt?: string;
};

export default function AdminSubscriptionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<RowSubscription[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const s = await apiFetch<RowSubscription[]>('/api/admin/subscriptions', { token });
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

  const sortedSubscriptions = useMemo(
    () =>
      [...subscriptions].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }),
    [subscriptions]
  );

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Subscriptions</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Subscription payments
        </h1>
        <p className="mt-1 text-sm text-neutral-600">All subscription records for your church (active and past).</p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Church subscription records</h2>
        </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-600">
                    <th className="px-4 py-2 font-medium">Member</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-800">
                  {sortedSubscriptions.map((sub) => (
                    <tr key={sub._id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2">{sub.user?.fullName || sub.user?.email || '—'}</td>
                      <td className="px-4 py-2">
                        {sub.currency || 'USD'} {Number(sub.monthlyPrice || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">{sub.status}</td>
                      <td className="px-4 py-2 text-neutral-600">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedSubscriptions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No subscription records yet.</p>
            ) : null}
      </div>
    </div>
  );
}

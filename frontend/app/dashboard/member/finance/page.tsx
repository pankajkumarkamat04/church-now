'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type PaymentRow = {
  _id: string;
  paymentOption: string;
  source: string;
  amount: number;
  currency: string;
  note?: string;
  paidAt?: string;
  createdAt?: string;
};

type ActivityRow = {
  id: string;
  kind: 'Payment';
  sortTime: number;
  amount: number;
  currency: string;
  summary: string;
  dateLabel: string;
};

function parseTime(d?: string | null): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function MemberFinanceRecordsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const p = await apiFetch<PaymentRow[]>('/api/member/payments', { token });
      setPayments(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load records');
    } finally {
      setBusy(false);
    }
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
      load();
    }
  }, [user, token, load]);

  const activity = useMemo(() => {
    const rows: ActivityRow[] = [];
    for (const r of payments) {
      const t = parseTime(r.paidAt) || parseTime(r.createdAt);
      rows.push({
        id: `p-${r._id}`,
        kind: 'Payment',
        sortTime: t,
        amount: r.amount,
        currency: r.currency,
        summary: r.note ? `${r.paymentOption} · ${r.note}` : `${r.paymentOption} · ${r.source}`,
        dateLabel: r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—',
      });
    }
    rows.sort((a, b) => b.sortTime - a.sortTime);
    return rows;
  }, [payments]);

  if (!user || !canAccessMemberPortal(user)) return null;

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <h1 className="text-2xl font-semibold text-neutral-900">My finance records</h1>
      <p className="mt-1 text-sm text-neutral-600">
        All payments for your account at your church, newest first. Only you can
        see these entries.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/dashboard/member/payments"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          Make payment
        </Link>
      </div>
      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}
      {busy ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <Loader2 className="size-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Summary</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-medium text-neutral-800">{r.kind}</td>
                  <td className="px-4 py-2 text-neutral-700">{r.summary}</td>
                  <td className="px-4 py-2">
                    {r.currency} {r.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{r.dateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">No finance activity yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

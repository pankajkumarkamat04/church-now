'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDisplayCurrencyInput } from '@/lib/currency';

type PaymentRow = {
  _id: string;
  paymentLines?: Array<{ paymentType: string; amount: number }>;
  amount: number;
  currency: string;
  displayCurrency?: string;
  amountDisplayTotal?: number | null;
  paidAt?: string;
  source: string;
  church?: { name?: string };
  user?: { fullName?: string; email?: string };
};

export default function SuperadminPaymentsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<PaymentRow[]>('/api/superadmin/payments', { token });
    setRows(data);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>
      <p className="mt-1 text-sm text-neutral-600">Platform-wide unified member payments.</p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Payment types and amounts</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.church?.name || '—'}</td>
                <td className="px-4 py-2">{r.user?.fullName || r.user?.email || '—'}</td>
                <td className="px-4 py-2">
                  {r.paymentLines && r.paymentLines.length > 0
                    ? r.paymentLines.map((line) => `${line.paymentType} ${line.amount.toFixed(2)}`).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-2">
                  <span className="font-medium">USD {r.amount.toFixed(2)}</span>
                  {r.displayCurrency && normalizeDisplayCurrencyInput(r.displayCurrency) !== 'USD' && r.amountDisplayTotal != null ? (
                    <span className="ml-1 block text-xs text-neutral-500">
                      entered {normalizeDisplayCurrencyInput(r.displayCurrency)} {Number(r.amountDisplayTotal).toFixed(2)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No payments yet.</p> : null}
      </div>
    </div>
  );
}

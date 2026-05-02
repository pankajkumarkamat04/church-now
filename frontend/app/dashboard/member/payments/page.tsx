'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { PAYMENT_OPTIONS, type PaymentOption } from '@/lib/payments';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type PaymentRow = {
  _id: string;
  paymentLines?: Array<{ paymentType: PaymentOption; amount: number }>;
  amount: number;
  currency: string;
  note?: string;
  paidAt?: string;
  source: string;
};

export default function MemberPaymentsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [amountsByOption, setAmountsByOption] = useState<Record<PaymentOption, string>>(() => ({
    TITHE: '',
    BUILDING: '',
    ROOF: '',
    GAZALAND: '',
    UTC: '',
    THANKS: '',
    MUSIC: '',
    XMAS: '',
    HARVEST: '',
  }));
  const [note, setNote] = useState('');
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const totalPreview = PAYMENT_OPTIONS.reduce((sum, option) => {
    const value = Number(amountsByOption[option] || '0');
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [data, balanceData] = await Promise.all([
      apiFetch<PaymentRow[]>('/api/member/payments', { token }),
      apiFetch<{ balance: number }>('/api/member/payments/balance', { token }),
    ]);
    setRows(data);
    setBalance(Number(balanceData.balance || 0));
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
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
    }
  }, [user, token, load]);

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const normalizedAmounts = PAYMENT_OPTIONS.reduce(
        (acc, option) => {
          const value = Number(amountsByOption[option] || '0');
          acc[option] = Number.isFinite(value) && value > 0 ? value : 0;
          return acc;
        },
        {} as Record<PaymentOption, number>
      );
      const hasAtLeastOneAmount = Object.values(normalizedAmounts).some((v) => v > 0);
      if (!hasAtLeastOneAmount) {
        throw new Error('Enter at least one payment amount');
      }
      if (totalPreview > balance) {
        throw new Error('Insufficient balance. Ask treasurer to deposit funds first.');
      }
      await apiFetch('/api/member/payments/pay', {
        method: 'POST',
        token,
        body: JSON.stringify({ amountsByOption: normalizedAmounts, currency, note }),
      });
      setAmountsByOption({
        TITHE: '',
        BUILDING: '',
        ROOF: '',
        GAZALAND: '',
        UTC: '',
        THANKS: '',
        MUSIC: '',
        XMAS: '',
        HARVEST: '',
      });
      setNote('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to submit payment');
    } finally {
      setBusy(false);
    }
  }

  if (!user || !canAccessMemberPortal(user)) return null;

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>
      <p className="mt-1 text-sm text-neutral-600">Use available balance deposited by treasurer, then allocate it across payment types.</p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Available balance</p>
        <p className="mt-1 text-xl font-semibold text-violet-900">
          {currency} {balance.toFixed(2)}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Preview total</p>
        <p className="mt-1 text-xl font-semibold text-emerald-900">
          {currency} {totalPreview.toFixed(2)}
        </p>
      </div>
      <form className="mt-6 grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 md:grid-cols-2" onSubmit={onPay}>
        {PAYMENT_OPTIONS.map((opt) => (
          <div key={opt}>
            <label className="mb-1 block text-xs font-medium text-neutral-600">{opt}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountsByOption[opt]}
              onChange={(e) => setAmountsByOption((prev) => ({ ...prev, [opt]: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Note (optional, applies to submitted options)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={busy || totalPreview > balance} className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit payments
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Payment types and amounts</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">
                  {r.paymentLines && r.paymentLines.length > 0
                    ? r.paymentLines.map((line) => `${line.paymentType} ${line.amount.toFixed(2)}`).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-2">{r.currency} {r.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{r.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No payments yet.</p> : null}
      </div>
    </div>
  );
}

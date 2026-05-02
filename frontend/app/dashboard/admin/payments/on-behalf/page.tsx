'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { PAYMENT_OPTIONS, type PaymentOption } from '@/lib/payments';
import { useAuth } from '@/contexts/AuthContext';
import {
  DISPLAY_CURRENCY_OPTIONS,
  type DisplayCurrency,
  displayAmountToUsd,
  fetchPublicCurrencyRates,
  formatDisplayMoney,
  normalizeDisplayCurrencyInput,
  type PublicCurrencyRates,
  usdToDisplayAmount,
} from '@/lib/currency';
import {
  churchRoleLabel,
  emptyAmountsByOption,
  memberDropdownLabel,
  type MemberBalanceRow,
} from '../_lib/treasurer-shared';

export default function AdminPaymentsOnBehalfPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberBalanceRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');
  const [rates, setRates] = useState<PublicCurrencyRates | null>(null);
  const [ratesErr, setRatesErr] = useState<string | null>(null);
  const [amountsByOption, setAmountsByOption] = useState<Record<PaymentOption, string>>(emptyAmountsByOption);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!token) return;
    const memberBalances = await apiFetch<MemberBalanceRow[]>('/api/admin/payments/member-balances', { token });
    setMembers(memberBalances);
    setSelectedMemberId((prev) => {
      if (prev && memberBalances.some((m) => m._id === prev)) return prev;
      return memberBalances[0]?._id || '';
    });
  }, [token]);

  useEffect(() => {
    fetchPublicCurrencyRates()
      .then(setRates)
      .catch((e) => setRatesErr(e instanceof Error ? e.message : 'Rates unavailable'));
  }, []);

  const selected = useMemo(
    () => members.find((m) => m._id === selectedMemberId),
    [members, selectedMemberId]
  );
  const balanceUsd = Number(selected?.walletBalance ?? 0);
  const balanceShown =
    rates && displayCurrency !== 'USD'
      ? usdToDisplayAmount(balanceUsd, displayCurrency, rates.foreignPerUsd)
      : balanceUsd;

  const totalPreview = PAYMENT_OPTIONS.reduce((sum, option) => {
    const value = Number(amountsByOption[option] || '0');
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  const totalPreviewUsd =
    rates && displayCurrency !== 'USD'
      ? displayAmountToUsd(totalPreview, displayCurrency, rates.foreignPerUsd)
      : totalPreview;

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      loadMembers().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
    }
  }, [user, token, loadMembers]);

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedMemberId) return;
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
      if (!rates && displayCurrency !== 'USD') {
        throw new Error('Exchange rates not loaded yet. Please wait or refresh.');
      }
      if (totalPreviewUsd > balanceUsd + 1e-9) {
        throw new Error('Insufficient balance for this person. Deposit funds on the Balances tab first.');
      }
      await apiFetch('/api/admin/payments/pay-on-behalf', {
        method: 'POST',
        token,
        body: JSON.stringify({
          memberId: selectedMemberId,
          amountsByOption: normalizedAmounts,
          displayCurrency,
          currency: displayCurrency,
          note,
        }),
      });
      setAmountsByOption(emptyAmountsByOption());
      setNote('');
      await loadMembers();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to submit payment');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <>
      <h2 className="text-lg font-semibold text-neutral-900">Pay on behalf</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Allocate payment types from someone&apos;s wallet the same way they would on the member portal—useful when they pay cash or need help entering splits.
      </p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {ratesErr ? <p className="mt-2 text-xs text-amber-800">{ratesErr} (USD amounts still work.)</p> : null}

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-neutral-600">Recipient</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full max-w-xl rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Select person</option>
          {members.map((m) => (
            <option key={m._id} value={m._id}>
              {memberDropdownLabel(m)}
            </option>
          ))}
        </select>
        {selected ? (
          <p className="mt-1 text-xs text-neutral-600">
            {churchRoleLabel(selected)} · Balance stored as USD {balanceUsd.toFixed(2)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Their available balance</p>
          <p className="mt-1 text-xl font-semibold text-violet-900">{formatDisplayMoney(displayCurrency, balanceShown)}</p>
          <p className="mt-1 text-xs text-violet-800/90">Stored as USD {balanceUsd.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Preview total</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{formatDisplayMoney(displayCurrency, totalPreview)}</p>
          <p className="mt-1 text-xs text-emerald-900/90">
            ≈ USD {totalPreviewUsd.toFixed(2)}{' '}
            {rates?.fetchedAt ? `(rates ${new Date(rates.fetchedAt).toLocaleString()})` : ''}
          </p>
        </div>
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
          <label className="mb-1 block text-xs font-medium text-neutral-600">Display / entry currency</label>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(normalizeDisplayCurrencyInput(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {DISPLAY_CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">Amounts convert and store in USD at live rates.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={
            busy ||
            !selectedMemberId ||
            totalPreviewUsd > balanceUsd + 1e-9 ||
            (!rates && displayCurrency !== 'USD')
          }
          className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Record payment on behalf
        </button>
      </form>
    </>
  );
}

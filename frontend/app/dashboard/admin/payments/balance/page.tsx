'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  DISPLAY_CURRENCY_OPTIONS,
  type DisplayCurrency,
  fetchPublicCurrencyRates,
  formatDisplayMoney,
  normalizeDisplayCurrencyInput,
  type PublicCurrencyRates,
  usdToDisplayAmount,
} from '@/lib/currency';
import {
  accountTypeLabel,
  churchRoleLabel,
  hasTreasurerPrivileges,
  memberDropdownLabel,
  type MemberBalanceRow,
} from '../_lib/treasurer-shared';

export default function AdminPaymentsBalancePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberBalanceRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState<DisplayCurrency>('USD');
  const [depositBusy, setDepositBusy] = useState(false);
  const [rates, setRates] = useState<PublicCurrencyRates | null>(null);
  const [listDisplay, setListDisplay] = useState<DisplayCurrency>('USD');
  const [err, setErr] = useState<string | null>(null);
  const canManagePayments = hasTreasurerPrivileges(user);

  const load = useCallback(async () => {
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
      .catch(() => {});
  }, []);

  async function onDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!canManagePayments) {
      setErr('Only Treasurer or Vice Treasurer can add balance and make payments.');
      return;
    }
    const amount = Number(depositAmount);
    if (!selectedMemberId) {
      setErr('Select a recipient');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr('Enter valid deposit amount');
      return;
    }
    setDepositBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/admin/payments/deposit', {
        method: 'POST',
        token,
        body: JSON.stringify({
          memberId: selectedMemberId,
          amount,
          displayCurrency: depositCurrency,
          currency: depositCurrency,
        }),
      });
      setDepositAmount('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to deposit balance');
    } finally {
      setDepositBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token && canManagePayments) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
    }
  }, [user, token, load, canManagePayments]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <>
      <h2 className="text-lg font-semibold text-neutral-900">Balances & deposits</h2>
      {!canManagePayments ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Only Treasurer or Vice Treasurer can add balance and make payments.
        </p>
      ) : null}
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <form onSubmit={onDeposit} className="mt-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Recipient</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={!canManagePayments}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select person (member or church admin)</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {memberDropdownLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Deposit amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            disabled={!canManagePayments}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
          <select
            value={depositCurrency}
            onChange={(e) => setDepositCurrency(normalizeDisplayCurrencyInput(e.target.value))}
            disabled={!canManagePayments}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {DISPLAY_CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={depositBusy || !canManagePayments}
          className="self-end inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {depositBusy ? 'Depositing...' : 'Deposit to balance'}
        </button>
      </form>
      <p className="mt-2 text-xs text-neutral-500">Balances are stored in USD; foreign amounts convert at live rates.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-neutral-600">Show balances in</label>
        <select
          value={listDisplay}
          onChange={(e) => setListDisplay(normalizeDisplayCurrencyInput(e.target.value))}
          className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
        >
          {DISPLAY_CURRENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium font-mono text-xs">Member ID</th>
              <th className="px-4 py-2 font-medium">Church role</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Current balance</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const usd = Number(m.walletBalance || 0);
              const shown =
                rates && listDisplay !== 'USD' ? usdToDisplayAmount(usd, listDisplay, rates.foreignPerUsd) : usd;
              return (
                <tr key={m._id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{m.fullName || '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        m.role === 'ADMIN'
                          ? 'rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900'
                          : 'rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800'
                      }
                    >
                      {accountTypeLabel(m)}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-700">{m.memberId?.trim() || '—'}</td>
                  <td className="max-w-[12rem] px-4 py-2 text-xs text-neutral-800">{churchRoleLabel(m)}</td>
                  <td className="px-4 py-2">{m.email || '—'}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium">{formatDisplayMoney(listDisplay, shown)}</span>
                    <span className="ml-2 text-xs text-neutral-500">(USD {usd.toFixed(2)})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

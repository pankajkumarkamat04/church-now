'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PaymentRow = {
  _id: string;
  paymentLines?: Array<{ paymentType: string; amount: number }>;
  amount: number;
  currency: string;
  paidAt?: string;
  source: string;
  user?: { fullName?: string; email?: string };
};

type MemberBalanceRow = {
  _id: string;
  fullName?: string;
  email?: string;
  walletBalance: number;
};

type DepositHistoryRow = {
  _id: string;
  amount: number;
  depositedAt?: string;
  member?: { fullName?: string; email?: string };
  depositedBy?: { fullName?: string; email?: string };
};

export default function AdminPaymentsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [members, setMembers] = useState<MemberBalanceRow[]>([]);
  const [depositHistory, setDepositHistory] = useState<DepositHistoryRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositBusy, setDepositBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [data, memberBalances, depositRows] = await Promise.all([
      apiFetch<PaymentRow[]>('/api/admin/payments', { token }),
      apiFetch<MemberBalanceRow[]>('/api/admin/payments/member-balances', { token }),
      apiFetch<DepositHistoryRow[]>('/api/admin/payments/deposits', { token }),
    ]);
    setRows(data);
    setMembers(memberBalances);
    setDepositHistory(depositRows);
    if (!selectedMemberId && memberBalances[0]?._id) {
      setSelectedMemberId(memberBalances[0]._id);
    }
  }, [token, selectedMemberId]);

  async function onDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const amount = Number(depositAmount);
    if (!selectedMemberId) {
      setErr('Select member');
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
        body: JSON.stringify({ memberId: selectedMemberId, amount }),
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
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>
      <p className="mt-1 text-sm text-neutral-600">Treasurer deposits member balances here; members allocate payments from that balance.</p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <form onSubmit={onDeposit} className="mt-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Member</label>
          <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.fullName || m.email || m._id}
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
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
        <button type="submit" disabled={depositBusy} className="self-end inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
          {depositBusy ? 'Depositing...' : 'Deposit to member balance'}
        </button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Current balance</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{m.fullName || '—'}</td>
                <td className="px-4 py-2">{m.email || '—'}</td>
                <td className="px-4 py-2">USD {Number(m.walletBalance || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Deposited by</th>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {depositHistory.map((d) => (
              <tr key={d._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-2">{d.depositedBy?.fullName || d.depositedBy?.email || '—'}</td>
                <td className="px-4 py-2">{d.member?.fullName || d.member?.email || '—'}</td>
                <td className="px-4 py-2">USD {Number(d.amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {depositHistory.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No deposit history yet.</p> : null}
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
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
                <td className="px-4 py-2">{r.user?.fullName || r.user?.email || '—'}</td>
                <td className="px-4 py-2">
                  {r.paymentLines && r.paymentLines.length > 0
                    ? r.paymentLines.map((line) => `${line.paymentType} ${line.amount.toFixed(2)}`).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-2">{r.currency} {r.amount.toFixed(2)}</td>
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

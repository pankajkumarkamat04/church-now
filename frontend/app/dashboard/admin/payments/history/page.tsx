'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDisplayCurrencyInput } from '@/lib/currency';
import { PAYMENT_OPTIONS, amountsByPaymentOption } from '@/lib/payments';
import {
  churchRoleLabel,
  memberStatementHref,
  type DepositHistoryRow,
  type PaymentRow,
} from '../_lib/treasurer-shared';

export default function AdminPaymentsHistoryPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [depositHistory, setDepositHistory] = useState<DepositHistoryRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [payments, deposits] = await Promise.all([
      apiFetch<PaymentRow[]>('/api/admin/payments', { token }),
      apiFetch<DepositHistoryRow[]>('/api/admin/payments/deposits', { token }),
    ]);
    setRows(payments);
    setDepositHistory(deposits);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <>
      <h2 className="text-lg font-semibold text-neutral-900">History</h2>
      <p className="mt-1 text-sm text-neutral-600">Deposits and payment allocations for your church (most recent first).</p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <h3 className="mt-6 text-sm font-semibold text-neutral-800">Deposits</h3>
      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Deposited by</th>
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {depositHistory.map((d) => (
              <tr key={d._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-2">{d.depositedBy?.fullName || d.depositedBy?.email || '—'}</td>
                <td className="px-4 py-2">
                  <span className="font-medium text-neutral-900">{d.member?.fullName || d.member?.email || '—'}</span>
                  {d.member?.memberId?.trim() ? (
                    <span className="ml-1 font-mono text-xs text-neutral-600">· ID {d.member.memberId.trim()}</span>
                  ) : null}
                  {d.member?.role === 'ADMIN' ? (
                    <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-violet-900">
                      Admin
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-xs text-neutral-600">{churchRoleLabel(d.member || {})}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="font-medium">USD {Number(d.amount || 0).toFixed(2)}</span>
                  {d.displayCurrency && d.displayCurrency !== 'USD' && d.amountDisplay != null ? (
                    <span className="ml-1 block text-xs text-neutral-500">
                      entered {normalizeDisplayCurrencyInput(d.displayCurrency)} {Number(d.amountDisplay).toFixed(2)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-right">
                  {memberStatementHref(d.member?._id) ? (
                    <Link
                      href={memberStatementHref(d.member?._id)!}
                      className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {depositHistory.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No deposit history yet.</p>
        ) : null}
      </div>

      <h3 className="mt-8 text-sm font-semibold text-neutral-800">Payments</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Per-type amounts are USD (same as row total). Scroll horizontally if needed.
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="sticky left-0 z-10 border-r border-neutral-200 bg-neutral-50 px-4 py-2 font-medium">Member</th>
              {PAYMENT_OPTIONS.map((opt) => (
                <th key={opt} className="whitespace-nowrap px-2 py-2 text-center text-xs font-medium">
                  {opt}
                </th>
              ))}
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Recorded by</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const byType = amountsByPaymentOption(r.paymentLines);
              return (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="sticky left-0 z-10 border-r border-neutral-100 bg-white px-4 py-2">
                  <span className="font-medium text-neutral-900">{r.user?.fullName || r.user?.email || '—'}</span>
                  {r.user?.memberId?.trim() ? (
                    <span className="ml-1 font-mono text-xs text-neutral-600">· ID {r.user.memberId.trim()}</span>
                  ) : null}
                  {r.user?.role === 'ADMIN' ? (
                    <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-violet-900">
                      Admin
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-xs text-neutral-600">{churchRoleLabel(r.user || {})}</span>
                </td>
                {PAYMENT_OPTIONS.map((opt) => {
                  const v = byType[opt];
                  return (
                    <td key={opt} className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs text-neutral-800">
                      {v > 0 ? v.toFixed(2) : '—'}
                    </td>
                  );
                })}
                <td className="px-4 py-2">
                  <span className="font-medium">USD {r.amount.toFixed(2)}</span>
                  {r.displayCurrency && r.displayCurrency !== 'USD' && r.amountDisplayTotal != null ? (
                    <span className="ml-1 block text-xs text-neutral-500">
                      entered {normalizeDisplayCurrencyInput(r.displayCurrency)} {Number(r.amountDisplayTotal).toFixed(2)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{r.source}</td>
                <td className="px-4 py-2 text-xs text-neutral-700">
                  {r.createdBy?.fullName || r.createdBy?.email || (r.source === 'MEMBER' ? 'Member' : '—')}
                </td>
                <td className="px-4 py-2 text-right">
                  {memberStatementHref(r.user?._id) ? (
                    <Link
                      href={memberStatementHref(r.user?._id)!}
                      className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No payments yet.</p> : null}
      </div>
    </>
  );
}

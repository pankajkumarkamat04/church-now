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
  superadminChurchHref,
  superadminUserHref,
  type SuperadminDepositRow,
  type SuperadminPaymentRow,
} from '../_lib/shared';

export default function SuperadminPaymentsHistoryPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<SuperadminPaymentRow[]>([]);
  const [deposits, setDeposits] = useState<SuperadminDepositRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [pRows, dRows] = await Promise.all([
      apiFetch<SuperadminPaymentRow[]>('/api/superadmin/payments', { token }),
      apiFetch<SuperadminDepositRow[]>('/api/superadmin/payments/deposits', { token }),
    ]);
    setPayments(pRows);
    setDeposits(dRows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <>
      <h2 className="text-lg font-semibold text-neutral-900">Full history</h2>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <h3 className="mt-6 text-sm font-semibold text-neutral-800">Deposits</h3>
      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Deposited by</th>
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => {
              const churchId = d.church && typeof d.church === 'object' && '_id' in d.church ? String(d.church._id) : '';
              return (
                <tr key={d._id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">
                    {d.church?.name ? (
                      superadminChurchHref(churchId) ? (
                        <Link href={superadminChurchHref(churchId)!} className="text-violet-800 hover:underline">
                          {d.church.name}
                        </Link>
                      ) : (
                        d.church.name
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">{d.depositedBy?.fullName || d.depositedBy?.email || '—'}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium">{d.member?.fullName || d.member?.email || '—'}</span>
                    <span className="mt-0.5 block text-xs text-neutral-600">{churchRoleLabel(d.member || {})}</span>
                  </td>
                  <td className="px-4 py-2">
                    USD {Number(d.amount || 0).toFixed(2)}
                    {d.displayCurrency && d.displayCurrency !== 'USD' && d.amountDisplay != null ? (
                      <span className="ml-1 block text-xs text-neutral-500">
                        entered {normalizeDisplayCurrencyInput(d.displayCurrency)} {Number(d.amountDisplay).toFixed(2)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {superadminUserHref(d.member?._id) ? (
                      <Link href={superadminUserHref(d.member?._id)!} className="text-xs font-medium text-sky-700 hover:underline">
                        User
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {deposits.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No deposits yet.</p> : null}
      </div>

      <h3 className="mt-8 text-sm font-semibold text-neutral-800">Payments</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Per-type amounts are USD. Scroll horizontally to see all columns.
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="sticky left-0 z-10 border-r border-neutral-200 bg-neutral-50 px-4 py-2 font-medium">Church</th>
              <th className="min-w-[12rem] px-4 py-2 font-medium">Member</th>
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
            {payments.map((r) => {
              const churchId =
                r.church && typeof r.church === 'object' && '_id' in r.church ? String(r.church._id) : '';
              const byType = amountsByPaymentOption(r.paymentLines);
              return (
                <tr key={r._id} className="border-t border-neutral-100">
                  <td className="sticky left-0 z-10 border-r border-neutral-100 bg-white px-4 py-2">
                    {r.church?.name ? (
                      superadminChurchHref(churchId) ? (
                        <Link href={superadminChurchHref(churchId)!} className="text-violet-800 hover:underline">
                          {r.church.name}
                        </Link>
                      ) : (
                        r.church.name
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="min-w-[12rem] px-4 py-2">
                    <span className="font-medium">{r.user?.fullName || r.user?.email || '—'}</span>
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
                    USD {r.amount.toFixed(2)}
                    {r.displayCurrency && normalizeDisplayCurrencyInput(r.displayCurrency) !== 'USD' && r.amountDisplayTotal != null ? (
                      <span className="ml-1 block text-xs text-neutral-500">
                        entered {normalizeDisplayCurrencyInput(r.displayCurrency)} {Number(r.amountDisplayTotal).toFixed(2)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2">{r.source}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.createdBy?.fullName || r.createdBy?.email || (r.source === 'MEMBER' ? 'Member' : '—')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {superadminUserHref(r.user?._id) ? (
                      <Link href={superadminUserHref(r.user?._id)!} className="text-xs font-medium text-sky-700 hover:underline">
                        User
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payments.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No payments yet.</p> : null}
      </div>
    </>
  );
}

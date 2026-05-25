'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDisplayCurrencyInput } from '@/lib/currency';
import { amountsByPaymentOption, labelForPaymentType } from '@/lib/payments';
import { useAdminPaymentTypes } from '@/lib/paymentTypes';
import { Pagination } from '@/components/ui/Pagination';
import { TransactionDeletionActions } from '@/components/finance/TransactionDeletionActions';
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
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(20);
  const [payMeta, setPayMeta] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [depositHistory, setDepositHistory] = useState<DepositHistoryRow[]>([]);
  const [depPage, setDepPage] = useState(1);
  const [depPageSize, setDepPageSize] = useState(20);
  const [depMeta, setDepMeta] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [err, setErr] = useState<string | null>(null);
  const { types, labels } = useAdminPaymentTypes(token);
  const columnCodes = types.map((t) => t.code);

  const load = useCallback(async () => {
    if (!token) return;
    const [payRes, depRes] = await Promise.all([
      apiFetch<{ data: PaymentRow[]; total: number; page: number; limit: number; totalPages: number }>(
        `/api/admin/payments?page=${payPage}&limit=${payPageSize}`, { token }
      ),
      apiFetch<{ data: DepositHistoryRow[]; total: number; page: number; limit: number; totalPages: number }>(
        `/api/admin/payments/deposits?page=${depPage}&limit=${depPageSize}`, { token }
      ),
    ]);
    setRows(payRes.data);
    setPayMeta({ total: payRes.total, totalPages: payRes.totalPages, limit: payRes.limit ?? payPageSize });
    setDepositHistory(depRes.data);
    setDepMeta({ total: depRes.total, totalPages: depRes.totalPages, limit: depRes.limit ?? depPageSize });
  }, [token, payPage, depPage, payPageSize, depPageSize]);

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
      <div className="mt-2 rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 p-3 md:hidden">
          {depositHistory.map((d) => (
            <div key={d._id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-600">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">{d.member?.fullName || d.member?.email || '—'}</p>
              <p className="mt-1 text-xs text-neutral-600">Deposited by: {d.depositedBy?.fullName || d.depositedBy?.email || '—'}</p>
              <p className="mt-1 text-xs text-neutral-600">{churchRoleLabel(d.member || {})}</p>
              <p className="mt-2 text-sm font-medium text-neutral-900">USD {Number(d.amount || 0).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <table className="hidden w-full text-left text-sm md:table">
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
      <Pagination
        page={depPage}
        totalPages={depMeta.totalPages}
        total={depMeta.total}
        limit={depMeta.limit}
        onPageChange={setDepPage}
        onPageSizeChange={(n) => {
          setDepPageSize(n);
          setDepPage(1);
        }}
        className="mt-2"
      />

      <h3 className="mt-8 text-sm font-semibold text-neutral-800">Payments</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Per-type amounts are USD (same as row total). Deleting a payment requires treasurer, vice treasurer, and deacon
        approval.
      </p>
      <div className="mt-2 rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 p-3 md:hidden">
          {rows.map((r) => {
            const byType = amountsByPaymentOption(r.paymentLines, columnCodes);
            return (
              <div key={r._id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-sm font-semibold text-neutral-900">{r.user?.fullName || r.user?.email || '—'}</p>
                <p className="mt-1 text-xs text-neutral-600">{churchRoleLabel(r.user || {})}</p>
                <p className="mt-1 text-xs text-neutral-600">Date: {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</p>
                <p className="mt-1 text-xs text-neutral-600">Source: {r.source}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-neutral-700">
                  {columnCodes.map((opt) => (
                    <p key={opt}>
                      {labelForPaymentType(opt, labels)}: {byType[opt] > 0 ? byType[opt].toFixed(2) : '—'}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-sm font-medium text-neutral-900">USD {r.amount.toFixed(2)}</p>
                <div className="mt-2">
                  <TransactionDeletionActions
                    token={token}
                    targetKind="PAYMENT"
                    targetId={r._id}
                    pendingDeletion={r.pendingDeletion}
                    onChanged={load}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <table className="hidden w-full min-w-[1200px] text-left text-sm md:table">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="sticky left-0 z-10 border-r border-neutral-200 bg-neutral-50 px-4 py-2 font-medium">Member</th>
              {columnCodes.map((opt) => (
                <th key={opt} className="whitespace-nowrap px-2 py-2 text-center text-xs font-medium">
                  {labelForPaymentType(opt, labels)}
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
              const byType = amountsByPaymentOption(r.paymentLines, columnCodes);
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
                {columnCodes.map((opt) => {
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
                  <div className="flex flex-col items-end gap-1">
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
                    <TransactionDeletionActions
                      token={token}
                      targetKind="PAYMENT"
                      targetId={r._id}
                      pendingDeletion={r.pendingDeletion}
                      onChanged={load}
                    />
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No payments yet.</p> : null}
      </div>
      <Pagination
        page={payPage}
        totalPages={payMeta.totalPages}
        total={payMeta.total}
        limit={payMeta.limit}
        onPageChange={setPayPage}
        onPageSizeChange={(n) => {
          setPayPageSize(n);
          setPayPage(1);
        }}
        className="mt-2"
      />
    </>
  );
}

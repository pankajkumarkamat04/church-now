'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDisplayCurrencyInput } from '@/lib/currency';
import {
  churchRoleLabel,
  superadminChurchHref,
  superadminUserHref,
  type SuperadminPaymentRow,
} from '../_lib/shared';

export default function SuperadminPaymentsRecordsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<SuperadminPaymentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<SuperadminPaymentRow[]>('/api/superadmin/payments', { token });
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
    <>
      <h2 className="text-lg font-semibold text-neutral-900">Payment allocations</h2>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Payment types</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Recorded by</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const churchId =
                r.church && typeof r.church === 'object' && '_id' in r.church ? String(r.church._id) : '';
              return (
                <tr key={r._id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">
                    {r.church?.name ? (
                      superadminChurchHref(churchId) ? (
                        <Link href={superadminChurchHref(churchId)!} className="font-medium text-violet-800 hover:underline">
                          {r.church.name}
                        </Link>
                      ) : (
                        r.church.name
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2 text-xs text-neutral-700">
                    {r.createdBy?.fullName || r.createdBy?.email || (r.source === 'MEMBER' ? 'Member' : '—')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {superadminUserHref(r.user?._id) ? (
                      <Link
                        href={superadminUserHref(r.user?._id)!}
                        className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                      >
                        User
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

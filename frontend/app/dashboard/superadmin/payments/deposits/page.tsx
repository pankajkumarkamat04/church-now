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
  type SuperadminDepositRow,
} from '../_lib/shared';
import { Pagination } from '@/components/ui/Pagination';

export default function SuperadminPaymentsDepositsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<SuperadminDepositRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });

  const load = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<{ data: SuperadminDepositRow[]; total: number; totalPages: number; limit: number }>(`/api/superadmin/payments/deposits?page=${page}&limit=${pageSize}`, { token });
    setRows(res.data ?? []);
    setMeta({ total: res.total ?? 0, totalPages: res.totalPages ?? 1, limit: res.limit ?? pageSize });
  }, [token, page, pageSize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <>
      <h2 className="text-lg font-semibold text-neutral-900">Balance deposits</h2>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 p-3 md:hidden">
          {rows.map((d) => {
            const churchId = d.church && typeof d.church === 'object' && '_id' in d.church ? String(d.church._id) : '';
            return (
              <div key={d._id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-xs text-neutral-600">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {d.church?.name ? (superadminChurchHref(churchId) ? <Link href={superadminChurchHref(churchId)!} className="text-violet-800 hover:underline">{d.church.name}</Link> : d.church.name) : '—'}
                </p>
                <p className="mt-1 text-xs text-neutral-600">Deposited by: {d.depositedBy?.fullName || d.depositedBy?.email || '—'}</p>
                <p className="mt-1 text-xs text-neutral-600">Recipient: {d.member?.fullName || d.member?.email || '—'}</p>
                <p className="mt-1 text-xs text-neutral-600">{churchRoleLabel(d.member || {})}</p>
                <p className="mt-2 text-sm font-medium text-neutral-900">USD {Number(d.amount || 0).toFixed(2)}</p>
                {d.displayCurrency && d.displayCurrency !== 'USD' && d.amountDisplay != null ? (
                  <p className="text-xs text-neutral-500">entered {normalizeDisplayCurrencyInput(d.displayCurrency)} {Number(d.amountDisplay).toFixed(2)}</p>
                ) : null}
                <div className="mt-2">
                  {superadminUserHref(d.member?._id) ? (
                    <Link href={superadminUserHref(d.member?._id)!} className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline">User</Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <table className="hidden w-full text-left text-sm md:table">
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
            {rows.map((d) => {
              const churchId = d.church && typeof d.church === 'object' && '_id' in d.church ? String(d.church._id) : '';
              return (
                <tr key={d._id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">
                    {d.church?.name ? (
                      superadminChurchHref(churchId) ? (
                        <Link
                          href={superadminChurchHref(churchId)!}
                          className="font-medium text-violet-800 hover:underline"
                        >
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
                    {superadminUserHref(d.member?._id) ? (
                      <Link
                        href={superadminUserHref(d.member?._id)!}
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
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No deposits yet.</p> : null}
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </>
  );
}

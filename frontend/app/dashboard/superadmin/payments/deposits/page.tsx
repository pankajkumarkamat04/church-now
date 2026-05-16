'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
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

function churchIdFromDeposit(d: SuperadminDepositRow): string {
  return d.church && typeof d.church === 'object' && '_id' in d.church ? String(d.church._id) : '';
}

function DepositDetailModal({
  deposit,
  onClose,
}: {
  deposit: SuperadminDepositRow;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const churchId = churchIdFromDeposit(deposit);
  const churchHref = superadminChurchHref(churchId);
  const userHref = superadminUserHref(deposit.member?._id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposit-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Deposit</p>
            <h2 id="deposit-detail-title" className="text-lg font-semibold text-neutral-900">
              Payment details
            </h2>
            <p className="mt-0.5 font-mono text-xs text-neutral-500">{deposit._id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-500">When</dt>
              <dd className="mt-0.5 text-neutral-900">
                {deposit.depositedAt ? new Date(deposit.depositedAt).toLocaleString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Church</dt>
              <dd className="mt-0.5 text-neutral-900">
                {deposit.church?.name ? (
                  churchHref ? (
                    <Link href={churchHref} className="font-medium text-violet-800 hover:underline">
                      {deposit.church.name}
                    </Link>
                  ) : (
                    deposit.church.name
                  )
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Amount (USD)</dt>
              <dd className="mt-0.5 font-medium text-neutral-900">USD {Number(deposit.amount || 0).toFixed(2)}</dd>
            </div>
            {deposit.displayCurrency && deposit.displayCurrency !== 'USD' && deposit.amountDisplay != null ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Entered amount</dt>
                <dd className="mt-0.5 text-neutral-900">
                  {normalizeDisplayCurrencyInput(deposit.displayCurrency)} {Number(deposit.amountDisplay).toFixed(2)}
                </dd>
              </div>
            ) : null}
            {deposit.fxUsdPerUnit != null && Number.isFinite(Number(deposit.fxUsdPerUnit)) ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">FX (USD per display unit)</dt>
                <dd className="mt-0.5 font-mono text-neutral-900">{Number(deposit.fxUsdPerUnit).toFixed(6)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium text-neutral-500">Deposited by</dt>
              <dd className="mt-0.5 text-neutral-900">
                {deposit.depositedBy?.fullName || deposit.depositedBy?.email || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Recipient</dt>
              <dd className="mt-0.5 text-neutral-900">
                <span className="font-medium">{deposit.member?.fullName || deposit.member?.email || '—'}</span>
                {deposit.member?.email && deposit.member?.fullName ? (
                  <span className="mt-0.5 block text-xs font-normal text-neutral-600">{deposit.member.email}</span>
                ) : null}
                {deposit.member?.memberId?.trim() ? (
                  <span className="mt-1 block font-mono text-xs text-neutral-600">Member ID: {deposit.member.memberId.trim()}</span>
                ) : null}
                {deposit.member?.role === 'ADMIN' ? (
                  <span className="mt-1 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-violet-900">
                    Admin
                  </span>
                ) : null}
                <span className="mt-1 block text-xs text-neutral-600">{churchRoleLabel(deposit.member || {})}</span>
              </dd>
            </div>
          </dl>
          {(userHref || churchHref) && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
              {userHref ? (
                <Link
                  href={userHref}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Open recipient profile
                </Link>
              ) : null}
              {churchHref ? (
                <Link
                  href={churchHref}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Open church
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuperadminPaymentsDepositsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<SuperadminDepositRow[]>([]);
  const [detailDeposit, setDetailDeposit] = useState<SuperadminDepositRow | null>(null);
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

  const closeDetailModal = useCallback(() => setDetailDeposit(null), []);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <>
      {detailDeposit ? <DepositDetailModal deposit={detailDeposit} onClose={closeDetailModal} /> : null}
      <h2 className="text-lg font-semibold text-neutral-900">Balance deposits</h2>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 p-3 md:hidden">
          {rows.map((d) => {
            const churchId = churchIdFromDeposit(d);
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
                  <button
                    type="button"
                    onClick={() => setDetailDeposit(d)}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100"
                  >
                    View details
                  </button>
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
              const churchId = churchIdFromDeposit(d);
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
                    <button
                      type="button"
                      onClick={() => setDetailDeposit(d)}
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100"
                    >
                      View details
                    </button>
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

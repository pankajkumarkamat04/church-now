'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { SuperadminFinanceReadOnlyBanner } from '@/components/finance/SuperadminFinanceReadOnlyBanner';
import { Pagination } from '@/components/ui/Pagination';

type ProcurementRow = {
  _id: string;
  referenceNo?: string;
  title: string;
  status: string;
  church?: { name?: string };
  approvalProgress?: { approved: number; total: number };
  expense?: { receiptNumber?: string; amount?: number };
  quotations?: Array<{ supplierName?: string; amountUsd?: number; isSelected?: boolean }>;
};

type ConferenceRow = { _id: string; name: string };

function statusClass(status: string) {
  if (status === 'POSTED') return 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800';
  if (status === 'PENDING_LEADERSHIP') return 'rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800';
  if (status === 'REJECTED') return 'rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800';
  return 'rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800';
}

export default function SuperadminFinanceProcurementPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { churches } = useSuperadminChurches();
  const [rows, setRows] = useState<ProcurementRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [conferences, setConferences] = useState<ConferenceRow[]>([]);
  const [filterConference, setFilterConference] = useState('');
  const [filterChurch, setFilterChurch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (filterChurch) params.set('churchId', filterChurch);
    else if (filterConference) params.set('conferenceId', filterConference);
    if (filterStatus) params.set('status', filterStatus);
    const res = await apiFetch<{
      data: ProcurementRow[];
      total: number;
      totalPages: number;
      limit: number;
    }>(`/api/superadmin/procurements?${params.toString()}`, { token });
    setRows(res.data);
    setMeta({ total: res.total, totalPages: res.totalPages, limit: res.limit ?? pageSize });
  }, [token, filterChurch, filterConference, filterStatus, page, pageSize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || !user || user.role !== 'SUPERADMIN') return;
    apiFetch<ConferenceRow[] | Paginated<ConferenceRow>>('/api/superadmin/conferences?limit=500', { token })
      .then((raw) => setConferences(unwrapPaginatedArray(raw)))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conferences'));
  }, [token, user]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  const churchesForFilter = filterConference
    ? churches.filter((c) => c.conference && typeof c.conference !== 'string' && c.conference._id === filterConference)
    : churches;

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <SuperadminFinanceReadOnlyBanner />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Procurement</h1>
        <p className="mt-1 text-sm text-neutral-600">View congregation procurement requests and posted expenses (read-only).</p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          value={filterConference}
          onChange={(e) => {
            setFilterConference(e.target.value);
            setFilterChurch('');
            setPage(1);
          }}
        >
          <option value="">All conferences</option>
          {conferences.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          value={filterChurch}
          onChange={(e) => {
            setFilterChurch(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All churches</option>
          {churchesForFilter.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_LEADERSHIP">Awaiting leadership</option>
          <option value="REJECTED">Rejected</option>
          <option value="POSTED">Posted</option>
        </select>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Reference</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r._id}>
                <tr className="border-t border-neutral-100">
                  <td className="px-4 py-2">{r.church?.name || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.referenceNo || '—'}</td>
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">
                    <span className={statusClass(r.status)}>{r.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="text-sky-700 hover:underline"
                      onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                    >
                      {expandedId === r._id ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
                {expandedId === r._id ? (
                  <tr className="border-t border-neutral-50 bg-neutral-50/50">
                    <td colSpan={5} className="px-4 py-3 text-xs text-neutral-700">
                      {(r.quotations || []).map((q, i) => (
                        <p key={i}>
                          {q.supplierName || 'Quote'} — USD {Number(q.amountUsd ?? 0).toFixed(2)}
                          {q.isSelected ? ' (selected)' : ''}
                        </p>
                      ))}
                      {r.expense?.receiptNumber ? (
                        <p className="mt-2 text-neutral-600">Posted expense receipt: {r.expense.receiptNumber}</p>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No procurement records.</p> : null}
      </div>
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
        className="mt-2"
      />
    </div>
  );
}

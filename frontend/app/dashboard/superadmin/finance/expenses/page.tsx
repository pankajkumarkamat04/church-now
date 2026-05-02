'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

const CATEGORIES = ['SALARIES', 'BUILDING', 'PROJECTS - GU', 'PROJECTS - WATER VIEW', 'RATES', 'COUNCILS', 'OTHERS'];

type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  expenseDate?: string;
  church?: { name?: string };
  conference?: { name?: string; conferenceId?: string };
  createdBy?: { fullName?: string; email?: string };
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: { fullName?: string; email?: string } | null;
  approvedAt?: string | null;
};

type ConferenceRow = { _id: string; name: string; conferenceId?: string };

const field = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminFinanceExpensesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { churches } = useSuperadminChurches();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [conferences, setConferences] = useState<ConferenceRow[]>([]);
  const [filterConference, setFilterConference] = useState('');
  const [filterChurch, setFilterChurch] = useState('');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterChurch) {
      params.set('churchId', filterChurch);
    } else if (filterConference) {
      params.set('conferenceId', filterConference);
    }
    if (filterApprovalStatus) params.set('approvalStatus', filterApprovalStatus);
    const q = params.toString() ? `?${params.toString()}` : '';
    const data = await apiFetch<ExpenseRow[]>(`/api/superadmin/expenses${q}`, { token });
    setRows(data);
  }, [token, filterChurch, filterConference, filterApprovalStatus]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || !user || user.role !== 'SUPERADMIN') return;
    apiFetch<ConferenceRow[]>('/api/superadmin/conferences', { token })
      .then((data) => setConferences(data))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conferences'));
  }, [token, user]);

  const churchesForFilterConference = filterConference
    ? churches.filter(
        (c) => c.conference && typeof c.conference !== 'string' && c.conference._id === filterConference
      )
    : churches;

  useEffect(() => {
    if (!filterConference) return;
    const exists = churchesForFilterConference.some((c) => c._id === filterChurch);
    if (!exists) {
      setFilterChurch('');
    }
  }, [filterConference, churchesForFilterConference, filterChurch]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  async function remove(id: string) {
    if (!token || !window.confirm('Delete this expense?')) return;
    await apiFetch(`/api/superadmin/expenses/${id}`, { method: 'DELETE', token });
    await load();
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Expenses</h1>
        <p className="mt-1 text-sm text-neutral-600">Review expenses across churches. New superadmin expenses are created for main church and follow full approval flow.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/superadmin/finance/expenses/create" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Add expense
          </Link>
          <Link href="/dashboard/superadmin/finance/expenses/approvals" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            Pending approvals
          </Link>
        </div>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Filter by conference</label>
          <select
            value={filterConference}
            onChange={(e) => {
              setFilterConference(e.target.value);
              setFilterChurch('');
            }}
            className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All conferences</option>
            {conferences.map((conference) => (
              <option key={conference._id} value={conference._id}>
                {conference.name}
                {conference.conferenceId ? ` (${conference.conferenceId})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Filter by church</label>
          <select
            value={filterChurch}
            onChange={(e) => setFilterChurch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All churches</option>
            {churchesForFilterConference.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Filter by approval</label>
          <select
            value={filterApprovalStatus}
            onChange={(e) => setFilterApprovalStatus(e.target.value)}
            className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Conference</th>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Approval</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.conference?.name || r.conference?.conferenceId || '—'}</td>
                <td className="px-4 py-2">{r.church?.name || '—'}</td>
                <td className="px-4 py-2">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      r.approvalStatus === 'APPROVED'
                        ? 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                        : r.approvalStatus === 'REJECTED'
                          ? 'rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800'
                          : 'rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800'
                    }
                  >
                    {r.approvalStatus || 'PENDING'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {r.currency} {r.amount.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/dashboard/superadmin/finance/expenses/${r._id}/edit`} className="mr-2 inline-flex items-center text-violet-700 hover:underline">
                    Edit
                  </Link>
                  <button type="button" onClick={() => remove(r._id)} className="inline-flex items-center text-red-700 hover:underline">
                    <Trash2 className="mr-1 size-3.5" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No expenses yet.</p> : null}
      </div>
    </div>
  );
}

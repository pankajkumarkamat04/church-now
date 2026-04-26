'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate?: string;
  church?: { name?: string };
  conference?: { name?: string; conferenceId?: string };
  createdBy?: { fullName?: string; email?: string };
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export default function SuperadminExpenseApprovalsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<ExpenseRow[]>('/api/superadmin/expenses?approvalStatus=PENDING', { token });
    setRows(data);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  async function decideApproval(id: string, approvalStatus: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/expenses/${id}/approval`, {
        method: 'POST',
        token,
        body: JSON.stringify({ approvalStatus }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update approval');
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Pending expense approvals</h1>
          <p className="mt-1 text-sm text-neutral-600">Review church admin expenses awaiting superadmin decision.</p>
        </div>
        <Link href="/dashboard/superadmin/finance/expenses" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
          Back to expenses
        </Link>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Conference</th>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Created by</th>
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
                <td className="px-4 py-2">{r.currency} {r.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{r.createdBy?.fullName || r.createdBy?.email || '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => void decideApproval(r._id, 'APPROVED')} className="mr-2 inline-flex items-center text-emerald-700 hover:underline">
                    Approve
                  </button>
                  <button type="button" onClick={() => void decideApproval(r._id, 'REJECTED')} className="inline-flex items-center text-amber-700 hover:underline">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No pending approvals.</p> : null}
      </div>
    </div>
  );
}

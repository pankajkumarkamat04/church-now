'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  displayCurrency?: string;
  amountDisplayTotal?: number | null;
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

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Pending expense approvals</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Read-only. Approvals are completed by each church&apos;s treasurer or vice treasurer in church admin (main and
            local congregations).
          </p>
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
              <th className="px-4 py-2 font-medium">Approval route</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.conference?.name || r.conference?.conferenceId || '—'}</td>
                <td className="px-4 py-2">{r.church?.name || '—'}</td>
                <td className="px-4 py-2">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">
                  <span className="font-medium">USD {r.amount.toFixed(2)}</span>
                  {r.displayCurrency && String(r.displayCurrency).toUpperCase() !== 'USD' && r.amountDisplayTotal != null ? (
                    <span className="ml-1 block text-xs text-neutral-500">
                      entered {String(r.displayCurrency).toUpperCase()} {Number(r.amountDisplayTotal).toFixed(2)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2">{r.createdBy?.fullName || r.createdBy?.email || '—'}</td>
                <td className="px-4 py-2 text-neutral-600">
                  Church admin treasurer / vice treasurer
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

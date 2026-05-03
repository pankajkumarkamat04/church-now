'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { normalizeDisplayCurrencyInput } from '@/lib/currency';

type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  displayCurrency?: string;
  amountDisplayTotal?: number | null;
  category: string;
  description?: string;
  expenseDate?: string;
  approvalStatus?: string;
  approvalStage?: string;
  church?: { _id?: string; name?: string };
  conference?: { name?: string; conferenceId?: string };
  createdBy?: { fullName?: string; email?: string };
  approvedBy?: { fullName?: string; email?: string } | null;
};

export default function SuperadminExpenseDetailPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ expenseId: string }>();
  const expenseId = String(params?.expenseId || '');
  const [row, setRow] = useState<ExpenseRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || !expenseId || !user || user.role !== 'SUPERADMIN') return;
    apiFetch<ExpenseRow>(`/api/superadmin/expenses/${expenseId}`, { token })
      .then(setRow)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load expense'));
  }, [token, expenseId, user]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  const churchId = row?.church?._id ? String(row.church._id) : '';
  const churchHref = churchId ? `/dashboard/superadmin/churches/${churchId}/edit` : null;

  return (
    <div className="w-full min-w-0 max-w-4xl">
      <FinanceSectionNav variant="superadmin" />
      <Link href="/dashboard/superadmin/finance/expenses" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to expenses
      </Link>

      {!row && !err ? (
        <div className="mt-8 flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-violet-600" />
        </div>
      ) : null}

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}

      {row ? (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">Expense detail</h1>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div className="md:col-span-2">
              <dt className="text-xs font-medium text-neutral-500">Title</dt>
              <dd className="mt-0.5 font-medium text-neutral-900">{row.title}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Church</dt>
              <dd className="mt-0.5 text-neutral-900">
                {row.church?.name ? (
                  churchHref ? (
                    <Link href={churchHref} className="text-violet-800 hover:underline">
                      {row.church.name}
                    </Link>
                  ) : (
                    row.church.name
                  )
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Conference</dt>
              <dd className="mt-0.5 text-neutral-900">{row.conference?.name || row.conference?.conferenceId || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Amount (stored USD)</dt>
              <dd className="mt-0.5 font-medium text-neutral-900">USD {Number(row.amount || 0).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Entered currency</dt>
              <dd className="mt-0.5 text-neutral-900">
                {row.displayCurrency && normalizeDisplayCurrencyInput(row.displayCurrency) !== 'USD' && row.amountDisplayTotal != null
                  ? `${normalizeDisplayCurrencyInput(row.displayCurrency)} ${Number(row.amountDisplayTotal).toFixed(2)}`
                  : 'USD'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Category</dt>
              <dd className="mt-0.5 text-neutral-900">{row.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Date</dt>
              <dd className="mt-0.5 text-neutral-900">
                {row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs font-medium text-neutral-500">Description</dt>
              <dd className="mt-0.5 text-neutral-900">{row.description?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Approval status</dt>
              <dd className="mt-0.5 text-neutral-900">{row.approvalStatus || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Stage</dt>
              <dd className="mt-0.5 text-neutral-900">{row.approvalStage || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Created by</dt>
              <dd className="mt-0.5 text-neutral-900">{row.createdBy?.fullName || row.createdBy?.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Approved by</dt>
              <dd className="mt-0.5 text-neutral-900">{row.approvedBy?.fullName || row.approvedBy?.email || '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

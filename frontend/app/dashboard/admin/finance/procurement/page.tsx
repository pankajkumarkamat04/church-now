'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { Pagination } from '@/components/ui/Pagination';
import {
  DISPLAY_CURRENCY_OPTIONS,
  type DisplayCurrency,
  normalizeDisplayCurrencyInput,
} from '@/lib/currency';

type QuotationForm = {
  supplierName: string;
  referenceNo: string;
  amount: string;
  displayCurrency: DisplayCurrency;
  notes: string;
  isSelected: boolean;
};

type ProcurementRow = {
  _id: string;
  referenceNo?: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PENDING_LEADERSHIP' | 'REJECTED' | 'POSTED';
  quotations?: Array<{
    _id?: string;
    supplierName?: string;
    referenceNo?: string;
    amount?: number;
    amountUsd?: number;
    displayCurrency?: string;
    isSelected?: boolean;
  }>;
  bill?: {
    billNumber?: string;
    referenceNo?: string;
    billDate?: string;
    amount?: number;
    amountUsd?: number;
    displayCurrency?: string;
    notes?: string;
  };
  rejectionReason?: string;
  approvalProgress?: { approved: number; total: number };
  canCurrentUserEdit?: boolean;
  canCurrentUserSubmit?: boolean;
  canCurrentUserApprove?: boolean;
  canCurrentUserReject?: boolean;
  expense?: { _id?: string; title?: string; amount?: number; receiptNumber?: string };
  leadershipApprovals?: Array<{ roleKey: string; roleLabel?: string; approved?: boolean }>;
};

const emptyQuote = (): QuotationForm => ({
  supplierName: '',
  referenceNo: '',
  amount: '',
  displayCurrency: 'USD',
  notes: '',
  isSelected: false,
});

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

function statusLabel(status: ProcurementRow['status']) {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_LEADERSHIP':
      return 'Awaiting leadership';
    case 'REJECTED':
      return 'Rejected';
    case 'POSTED':
      return 'Posted to expenses';
    default:
      return status;
  }
}

function statusClass(status: ProcurementRow['status']) {
  switch (status) {
    case 'POSTED':
      return 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800';
    case 'PENDING_LEADERSHIP':
      return 'rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800';
    case 'REJECTED':
      return 'rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800';
    default:
      return 'rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800';
  }
}

export default function AdminFinanceProcurementPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ProcurementRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ProcurementRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [description, setDescription] = useState('');
  const [quotations, setQuotations] = useState<QuotationForm[]>([emptyQuote()]);
  const [billNumber, setBillNumber] = useState('');
  const [billRef, setBillRef] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCurrency, setBillCurrency] = useState<DisplayCurrency>('USD');
  const [billNotes, setBillNotes] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<{
      data: ProcurementRow[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/admin/procurements?page=${page}&limit=${pageSize}`, { token });
    setRows(res.data);
    setMeta({ total: res.total, totalPages: res.totalPages, limit: res.limit ?? pageSize });
  }, [token, page, pageSize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  function resetForm() {
    setEditing(null);
    setShowForm(false);
    setTitle('');
    setReferenceNo('');
    setDescription('');
    setQuotations([emptyQuote()]);
    setBillNumber('');
    setBillRef('');
    setBillDate('');
    setBillAmount('');
    setBillCurrency('USD');
    setBillNotes('');
  }

  function startEdit(row: ProcurementRow) {
    setEditing(row);
    setShowForm(true);
    setTitle(row.title);
    setReferenceNo(row.referenceNo || '');
    setDescription(row.description || '');
    setQuotations(
      row.quotations?.length
        ? row.quotations.map((q) => ({
            supplierName: q.supplierName || '',
            referenceNo: q.referenceNo || '',
            amount: String(q.amount ?? q.amountUsd ?? ''),
            displayCurrency: normalizeDisplayCurrencyInput(q.displayCurrency || 'USD'),
            notes: '',
            isSelected: Boolean(q.isSelected),
          }))
        : [emptyQuote()]
    );
    const b = row.bill || {};
    setBillNumber(b.billNumber || '');
    setBillRef(b.referenceNo || '');
    setBillDate(b.billDate ? new Date(b.billDate).toISOString().slice(0, 10) : '');
    setBillAmount(b.amount != null ? String(b.amount) : b.amountUsd != null ? String(b.amountUsd) : '');
    setBillCurrency(normalizeDisplayCurrencyInput(b.displayCurrency || 'USD'));
    setBillNotes(b.notes || '');
  }

  function buildPayload() {
    const selectedCount = quotations.filter((q) => q.isSelected).length;
    if (selectedCount !== 1) {
      throw new Error('Select exactly one quotation');
    }
    return {
      title: title.trim(),
      referenceNo: referenceNo.trim(),
      description,
      quotations: quotations
        .filter((q) => q.amount.trim() !== '')
        .map((q) => ({
          supplierName: q.supplierName.trim(),
          referenceNo: q.referenceNo.trim(),
          amount: Number(q.amount),
          displayCurrency: q.displayCurrency,
          notes: q.notes.trim(),
          isSelected: q.isSelected,
        })),
      bill: {
        billNumber: billNumber.trim(),
        referenceNo: billRef.trim(),
        billDate: billDate ? new Date(billDate).toISOString() : undefined,
        amount: billAmount.trim() ? Number(billAmount) : undefined,
        displayCurrency: billCurrency,
        notes: billNotes.trim(),
      },
    };
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const body = buildPayload();
      if (editing) {
        await apiFetch(`/api/admin/procurements/${editing._id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/api/admin/procurements', {
          method: 'POST',
          token,
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitForApproval(id: string) {
    if (!token) return;
    setErr(null);
    try {
      await apiFetch(`/api/admin/procurements/${id}/submit`, { method: 'POST', token });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to submit');
    }
  }

  async function onApprove(id: string) {
    if (!token) return;
    try {
      await apiFetch(`/api/admin/procurements/${id}/approve`, { method: 'POST', token });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to approve');
    }
  }

  async function onReject(id: string) {
    if (!token) return;
    const reason = window.prompt('Reason for rejection (optional):') ?? '';
    try {
      await apiFetch(`/api/admin/procurements/${id}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to reject');
    }
  }

  function setQuoteSelected(index: number) {
    setQuotations((prev) => prev.map((q, i) => ({ ...q, isSelected: i === index })));
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Procurement</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Add quotations and bill details, submit for approval by all assigned local leadership, then auto-post to
          expenses when fully approved.
        </p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      {!showForm ? (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="mb-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          <Plus className="size-4" /> New procurement
        </button>
      ) : null}

      {showForm ? (
        <form className="mb-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" onSubmit={onSave}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
              <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Reference no.</label>
              <input className={field} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} required />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
              <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800">Quotations</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
                onClick={() => setQuotations((p) => [...p, emptyQuote()])}
              >
                <Plus className="size-3.5" /> Add quotation
              </button>
            </div>
            <div className="space-y-3">
              {quotations.map((q, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700">
                      <input
                        type="radio"
                        name="selectedQuote"
                        checked={q.isSelected}
                        onChange={() => setQuoteSelected(idx)}
                      />
                      Selected for procurement
                    </label>
                    {quotations.length > 1 ? (
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => setQuotations((p) => p.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className={field}
                      placeholder="Supplier"
                      value={q.supplierName}
                      onChange={(e) =>
                        setQuotations((p) => p.map((row, i) => (i === idx ? { ...row, supplierName: e.target.value } : row)))
                      }
                    />
                    <input
                      className={field}
                      placeholder="Quote reference no."
                      value={q.referenceNo}
                      onChange={(e) =>
                        setQuotations((p) => p.map((row, i) => (i === idx ? { ...row, referenceNo: e.target.value } : row)))
                      }
                    />
                    <input
                      className={field}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={q.amount}
                      onChange={(e) =>
                        setQuotations((p) => p.map((row, i) => (i === idx ? { ...row, amount: e.target.value } : row)))
                      }
                    />
                    <select
                      className={field}
                      value={q.displayCurrency}
                      onChange={(e) =>
                        setQuotations((p) =>
                          p.map((row, i) =>
                            i === idx ? { ...row, displayCurrency: normalizeDisplayCurrencyInput(e.target.value) } : row
                          )
                        )
                      }
                    >
                      {DISPLAY_CURRENCY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">Bill (optional — used for final amount if set)</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={field} placeholder="Bill number" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
              <input className={field} placeholder="Bill reference no." value={billRef} onChange={(e) => setBillRef(e.target.value)} />
              <input className={field} type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                placeholder="Bill amount"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
              />
              <select
                className={field}
                value={billCurrency}
                onChange={(e) => setBillCurrency(normalizeDisplayCurrencyInput(e.target.value))}
              >
                {DISPLAY_CURRENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input className={field} placeholder="Bill notes" value={billNotes} onChange={(e) => setBillNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? 'Update draft' : 'Save draft'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Reference</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Approvals</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r._id}>
                <tr className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-mono text-xs">{r.referenceNo || '—'}</td>
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">
                    <span className={statusClass(r.status)}>{statusLabel(r.status)}</span>
                    {r.status === 'REJECTED' && r.rejectionReason ? (
                      <p className="mt-1 text-xs text-red-700">{r.rejectionReason}</p>
                    ) : null}
                    {r.status === 'POSTED' && r.expense?.receiptNumber ? (
                      <p className="mt-1 text-xs text-neutral-500">Expense receipt {r.expense.receiptNumber}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-600">
                    {r.approvalProgress
                      ? `${r.approvalProgress.approved} / ${r.approvalProgress.total}`
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="mr-2 text-neutral-600 hover:underline"
                      onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                    >
                      {expandedId === r._id ? 'Hide' : 'Details'}
                    </button>
                    {r.canCurrentUserEdit && (r.status === 'DRAFT' || r.status === 'REJECTED') ? (
                      <button type="button" onClick={() => startEdit(r)} className="mr-2 inline-flex items-center text-sky-700 hover:underline">
                        <Pencil className="mr-1 size-3.5" /> Edit
                      </button>
                    ) : null}
                    {r.canCurrentUserSubmit && (r.status === 'DRAFT' || r.status === 'REJECTED') ? (
                      <button type="button" onClick={() => void onSubmitForApproval(r._id)} className="mr-2 text-sky-700 hover:underline">
                        Submit
                      </button>
                    ) : null}
                    {r.canCurrentUserApprove ? (
                      <button type="button" onClick={() => void onApprove(r._id)} className="mr-2 text-emerald-700 hover:underline">
                        Approve
                      </button>
                    ) : null}
                    {r.canCurrentUserReject ? (
                      <button type="button" onClick={() => void onReject(r._id)} className="text-red-700 hover:underline">
                        Reject
                      </button>
                    ) : null}
                  </td>
                </tr>
                {expandedId === r._id ? (
                  <tr className="border-t border-neutral-50 bg-neutral-50/50">
                    <td colSpan={5} className="px-4 py-3 text-xs text-neutral-700">
                      <p className="font-medium text-neutral-800">Quotations</p>
                      <ul className="mt-1 list-disc pl-4">
                        {(r.quotations || []).map((q, i) => (
                          <li key={i}>
                            {q.supplierName || 'Supplier'} — {q.referenceNo || 'no ref'} — USD{' '}
                            {Number(q.amountUsd ?? q.amount ?? 0).toFixed(2)}
                            {q.isSelected ? ' (selected)' : ''}
                          </li>
                        ))}
                      </ul>
                      {r.leadershipApprovals?.length ? (
                        <>
                          <p className="mt-2 font-medium text-neutral-800">Leadership approvals</p>
                          <ul className="mt-1 list-disc pl-4">
                            {r.leadershipApprovals.map((a) => (
                              <li key={a.roleKey}>
                                {a.roleLabel || a.roleKey}: {a.approved ? 'Approved' : 'Pending'}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No procurement records yet.</p> : null}
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

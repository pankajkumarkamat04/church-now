'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { TransactionDeletionActions, type PendingDeletion } from '@/components/finance/TransactionDeletionActions';

type ChurchRow = {
  churchId: string;
  churchName: string;
  conferenceName: string;
  monthKey: string;
  totalIncome: number;
  mainChurch: { due: number; paid: number; balance: number; status: string; recipientName: string };
  conference: { due: number; paid: number; balance: number; status: string; recipientName: string };
  paymentStatus?: string;
  entries: Array<{
    id: string;
    remitType: string;
    amount: number;
    paidAt: string | null;
    note: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    postedByName?: string;
    createdByName?: string;
    updatedByName?: string;
    lastModifiedByName?: string;
  }>;
};

type AuditRow = {
  id: string;
  entryId: string | null;
  monthKey: string;
  remitType: string;
  amount: number | null;
  action: string;
  actorName: string;
  details: string;
  at: string | null;
};

type ChurchPayload = { monthKey: string; remitRatePercent: number; row: ChurchRow | null };

const nowMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const statusClass = (status: string) => {
  if (status === 'PAID') return 'bg-emerald-100 text-emerald-800';
  if (status === 'PARTIAL' || status === 'PARTIALLY_PAID') return 'bg-amber-100 text-amber-800';
  if (status === 'NO_DUE') return 'bg-neutral-100 text-neutral-700';
  return 'bg-rose-100 text-rose-800';
};

const statusLabel = (status: string) => (status === 'PARTIAL' ? 'PARTIALLY_PAID' : status);

export default function AdminRemittancesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(nowMonth());
  const [data, setData] = useState<ChurchPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ mainChurchAmount: '', conferenceAmount: '', paidAt: '', note: '' });
  const [editingEntryId, setEditingEntryId] = useState('');
  const [pendingDeletions, setPendingDeletions] = useState<Record<string, PendingDeletion>>({});
  const [entryEdit, setEntryEdit] = useState({ remitType: 'MAIN_CHURCH', amount: '', paidAt: '', note: '' });
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);

  const row = data?.row;

  const loadPendingDeletions = async () => {
    if (!token) return;
    const res = await apiFetch<{ rows: PendingDeletion[] }>(
      '/api/admin/transaction-deletions?status=PENDING&targetKind=REMITTANCE',
      { token }
    );
    const map: Record<string, PendingDeletion> = {};
    for (const row of res.rows || []) {
      const tid = String((row as PendingDeletion & { targetId?: string }).targetId ?? '');
      if (tid) map[tid] = row;
    }
    setPendingDeletions(map);
  };

  const loadAudit = async (targetMonth = month) => {
    if (!token) return;
    const q = new URLSearchParams({ month: targetMonth, limit: '200' });
    const res = await apiFetch<{ rows: AuditRow[] }>(
      `/api/admin/finance/remittances/audit?${q.toString()}`,
      { token }
    );
    setAuditRows(res.rows || []);
  };

  const load = async (targetMonth = month) => {
    if (!token) return;
    const q = new URLSearchParams({ month: targetMonth });
    const res = await apiFetch<ChurchPayload>(`/api/admin/finance/remittances/church?${q.toString()}`, { token });
    setData(res);
    await Promise.all([loadPendingDeletions(), loadAudit(targetMonth)]);
  };

  const actionLabel = (action: string) => {
    if (action === 'CREATED') return 'Posted';
    if (action === 'UPDATED') return 'Updated';
    if (action === 'DELETE_REQUESTED') return 'Delete requested';
    if (action === 'DELETE_APPROVED') return 'Delete approved';
    if (action === 'DELETED') return 'Deleted';
    return action;
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      setBusy(true);
      load()
        .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load remittances'))
        .finally(() => setBusy(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const maxTotalRemit = useMemo(() => {
    if (!row) return 0;
    const remaining = Math.max(0, row.totalIncome - row.mainChurch.paid - row.conference.paid);
    return remaining;
  }, [row]);

  if (!user || user.role !== 'ADMIN') return null;

  async function submitRemit() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/admin/finance/remittances/church', {
        method: 'POST',
        token,
        body: JSON.stringify({
          month,
          mainChurchAmount: Number(form.mainChurchAmount || 0),
          conferenceAmount: Number(form.conferenceAmount || 0),
          paidAt: form.paidAt || undefined,
          note: form.note,
        }),
      });
      setForm({ mainChurchAmount: '', conferenceAmount: '', paidAt: '', note: '' });
      await load(month);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to record remittance');
    } finally {
      setBusy(false);
    }
  }

  async function saveEntryEdit() {
    if (!token || !editingEntryId) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/admin/finance/remittances/church/entries/${editingEntryId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          remitType: entryEdit.remitType,
          amount: Number(entryEdit.amount),
          paidAt: entryEdit.paidAt || undefined,
          note: entryEdit.note,
        }),
      });
      setEditingEntryId('');
      await load(month);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update entry');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Remittances</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Record payments to your main church and conference (10% each of monthly income). Total remitted cannot exceed
          this month&apos;s income. Deleting an entry requires treasurer, vice treasurer, and deacon approval.
        </p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void load(month)}
          disabled={busy}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          Apply
        </button>
      </div>

      {busy && !row ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-sky-600" />
        </div>
      ) : null}

      {row ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Monthly income</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">USD {row.totalIncome.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">{row.mainChurch.recipientName} (10%)</p>
              <p className="mt-1 text-sm text-neutral-600">
                Due USD {row.mainChurch.due.toFixed(2)} · Paid USD {row.mainChurch.paid.toFixed(2)}
              </p>
              <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.mainChurch.status)}`}>
                {statusLabel(row.mainChurch.status)}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">{row.conference.recipientName} (10%)</p>
              <p className="mt-1 text-sm text-neutral-600">
                Due USD {row.conference.due.toFixed(2)} · Paid USD {row.conference.paid.toFixed(2)}
              </p>
              <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.conference.status)}`}>
                {statusLabel(row.conference.status)}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Remaining (within income cap)</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">USD {maxTotalRemit.toFixed(2)}</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Record remittance</h2>
            <p className="mt-1 text-xs text-neutral-600">
              {row.churchName} · {row.conferenceName} · {data?.remitRatePercent ?? 10}% rate per recipient
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Main church amount"
                value={form.mainChurchAmount}
                onChange={(e) => setForm((s) => ({ ...s, mainChurchAmount: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Conference amount"
                value={form.conferenceAmount}
                onChange={(e) => setForm((s) => ({ ...s, conferenceAmount: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.paidAt}
                onChange={(e) => setForm((s) => ({ ...s, paidAt: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Note"
                value={form.note}
                onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void submitRemit()}
              disabled={busy}
              className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              Record remittance
            </button>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Entries for {month}</h2>
            {row.entries.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No remittance entries yet for this month.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {row.entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-neutral-900">
                        {entry.remitType} · USD {entry.amount.toFixed(2)}
                        {entry.paidAt ? ` · ${new Date(entry.paidAt).toLocaleDateString()}` : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntryId(entry.id);
                            setEntryEdit({
                              remitType: entry.remitType,
                              amount: String(entry.amount),
                              paidAt: entry.paidAt ? new Date(entry.paidAt).toISOString().slice(0, 10) : '',
                              note: entry.note || '',
                            });
                          }}
                          className="rounded border border-sky-200 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <TransactionDeletionActions
                          token={token}
                          targetKind="REMITTANCE"
                          targetId={entry.id}
                          pendingDeletion={pendingDeletions[entry.id] || null}
                          onChanged={() => load(month)}
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      Posted by <span className="font-medium text-neutral-800">{entry.postedByName || entry.createdByName || '—'}</span>
                      {entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString()}` : ''}
                    </p>
                    {entry.updatedByName ? (
                      <p className="text-xs text-neutral-500">
                        Last updated by {entry.updatedByName}
                        {entry.updatedAt ? ` · ${new Date(entry.updatedAt).toLocaleString()}` : ''}
                      </p>
                    ) : null}
                    {entry.note ? <p className="mt-1 text-xs text-neutral-600">{entry.note}</p> : null}
                    {editingEntryId === entry.id ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-4">
                        <select
                          value={entryEdit.remitType}
                          onChange={(e) => setEntryEdit((s) => ({ ...s, remitType: e.target.value }))}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        >
                          <option value="MAIN_CHURCH">MAIN_CHURCH</option>
                          <option value="CONFERENCE">CONFERENCE</option>
                        </select>
                        <input
                          type="number"
                          value={entryEdit.amount}
                          onChange={(e) => setEntryEdit((s) => ({ ...s, amount: e.target.value }))}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        />
                        <input
                          type="date"
                          value={entryEdit.paidAt}
                          onChange={(e) => setEntryEdit((s) => ({ ...s, paidAt: e.target.value }))}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        />
                        <input
                          value={entryEdit.note}
                          onChange={(e) => setEntryEdit((s) => ({ ...s, note: e.target.value }))}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                          placeholder="Note"
                        />
                        <div className="flex gap-2 sm:col-span-4">
                          <button
                            type="button"
                            onClick={() => void saveEntryEdit()}
                            className="rounded bg-sky-600 px-3 py-1 text-xs text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEntryId('')}
                            className="rounded border border-neutral-300 px-3 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Audit trail</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Who posted, edited, or removed remittances for {month}. Entries stay in the log even after deletion.
            </p>
            {auditRows.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No audit events for this month yet.</p>
            ) : (
              <div className="mt-3 table-scroll overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Who</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((a) => (
                      <tr key={a.id} className="border-t border-neutral-100">
                        <td className="whitespace-nowrap px-3 py-2 text-neutral-700">
                          {a.at ? new Date(a.at).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
                            {actionLabel(a.action)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-neutral-900">{a.actorName || '—'}</td>
                        <td className="px-3 py-2 text-neutral-700">{a.remitType || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-neutral-900">
                          {a.amount != null ? `USD ${a.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="max-w-[280px] px-3 py-2 text-xs text-neutral-600">{a.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : !busy ? (
        <p className="text-sm text-neutral-600">No remittance data for this month.</p>
      ) : null}
    </div>
  );
}

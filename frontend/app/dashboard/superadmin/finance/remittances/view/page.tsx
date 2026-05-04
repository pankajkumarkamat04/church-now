'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

type ChurchDetails = {
  monthKey: string;
  selectedMonth?: {
    monthKey: string;
    totalIncome: number;
    paymentStatus?: string;
    mainChurch: { due: number; paid: number; balance: number; status: string; recipientName: string };
    conference: { due: number; paid: number; balance: number; status: string; recipientName: string };
  };
  lifetimeSummary?: {
    totalIncome: number;
    mainChurchDue: number;
    mainChurchPaid: number;
    mainChurchBalance: number;
    conferenceDue: number;
    conferencePaid: number;
    conferenceBalance: number;
    totalDue: number;
    totalPaid: number;
    totalBalance: number;
    paymentStatus?: string;
  };
  lifetimeEntries?: Array<{ id: string; monthKey?: string; remitType: string; amount: number; paidAt: string | null; note: string; createdByName?: string; createdAt?: string | null }>;
  monthlyRows?: Array<{
    monthKey: string;
    totalIncome: number;
    paymentStatus?: string;
    mainChurch: { due: number; paid: number; balance: number; status: string; recipientName: string };
    conference: { due: number; paid: number; balance: number; status: string; recipientName: string };
  }>;
  row: {
    churchId: string;
    churchName: string;
    conferenceName: string;
    totalIncome: number;
    paymentStatus?: string;
    mainChurch: { due: number; paid: number; balance: number; status: string; recipientName: string };
    conference: { due: number; paid: number; balance: number; status: string; recipientName: string };
    entries: Array<{ id: string; monthKey?: string; remitType: string; amount: number; paidAt: string | null; note: string; createdByName?: string; createdAt?: string | null }>;
  };
};

type SchoolDetails = {
  year: number;
  row: {
    schoolId: string;
    schoolName: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    note: string;
    totalDue: number;
    totalPaid: number;
    totalBalance: number;
    paymentStatus?: string;
    dues: Array<{ id: string; label: string; termKey?: string; dueAmount: number; paidAmount: number; balance: number; status: string; dueDate: string | null; note?: string }>;
    payments: Array<{ id: string; dueId: string | null; amount: number; paidAt: string | null; paymentMethod: string; referenceNo: string; note?: string; createdByName?: string }>;
  };
};

const statusClass = (status: string) => {
  if (status === 'PAID') return 'bg-emerald-100 text-emerald-800';
  if (status === 'PARTIAL' || status === 'PARTIALLY_PAID') return 'bg-amber-100 text-amber-800';
  if (status === 'NO_DUE') return 'bg-neutral-100 text-neutral-700';
  return 'bg-rose-100 text-rose-800';
};

const statusLabel = (status: string) => (status === 'PARTIAL' ? 'PARTIALLY_PAID' : status);

type ChurchEntryEdit = {
  remitType: string;
  amount: string;
  paidAt: string;
  note: string;
};

const toDateInput = (value: string | null | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export default function RemittanceDetailsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = String(searchParams.get('kind') || '').toLowerCase();
  const id = String(searchParams.get('id') || '').trim();
  const month = String(searchParams.get('month') || '').trim();
  const year = String(searchParams.get('year') || '').trim();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [churchData, setChurchData] = useState<ChurchDetails | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolDetails | null>(null);
  const [editingChurchEntryId, setEditingChurchEntryId] = useState<string | null>(null);
  const [churchEntryEdit, setChurchEntryEdit] = useState<ChurchEntryEdit>({ remitType: 'MAIN_CHURCH', amount: '', paidAt: '', note: '' });
  const [savingChurchEntry, setSavingChurchEntry] = useState(false);
  const [savingChurchPayment, setSavingChurchPayment] = useState(false);
  const [churchPaymentForm, setChurchPaymentForm] = useState({
    month: month || new Date().toISOString().slice(0, 7),
    mainChurchAmount: '',
    conferenceAmount: '',
    paidAt: '',
    note: '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  const loadDetails = async () => {
    if (!token || !id || (kind !== 'church' && kind !== 'school')) return;
    setBusy(true);
    setErr(null);
    const q = new URLSearchParams();
    if (month) q.set('month', month);
    if (year) q.set('year', year);
    const qs = q.toString();
    const path =
      kind === 'church'
        ? `/api/superadmin/finance/remittances/church/${id}/details${qs ? `?${qs}` : ''}`
        : `/api/superadmin/finance/remittances/schools/${id}/details${qs ? `?${qs}` : ''}`;
    try {
      const res = await apiFetch<ChurchDetails | SchoolDetails>(path, { token });
      if (kind === 'church') {
        setChurchData(res as ChurchDetails);
      } else {
        setSchoolData(res as SchoolDetails);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load details');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [token, kind, id, month, year]);

  const startChurchEntryEdit = (entry: ChurchDetails['row']['entries'][number]) => {
    setErr(null);
    setEditingChurchEntryId(entry.id);
    setChurchEntryEdit({
      remitType: entry.remitType,
      amount: String(entry.amount || ''),
      paidAt: toDateInput(entry.paidAt),
      note: entry.note || '',
    });
  };

  const cancelChurchEntryEdit = () => {
    setEditingChurchEntryId(null);
    setChurchEntryEdit({ remitType: 'MAIN_CHURCH', amount: '', paidAt: '', note: '' });
  };

  const saveChurchEntryEdit = async () => {
    if (!token || !editingChurchEntryId) return;
    const amount = Number(churchEntryEdit.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr('Amount must be greater than 0');
      return;
    }

    setSavingChurchEntry(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/church/entries/${editingChurchEntryId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          remitType: churchEntryEdit.remitType,
          amount,
          paidAt: churchEntryEdit.paidAt || undefined,
          note: churchEntryEdit.note,
        }),
      });
      await loadDetails();
      cancelChurchEntryEdit();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update remittance entry');
    } finally {
      setSavingChurchEntry(false);
    }
  };

  const submitChurchPayment = async () => {
    if (!token || !id) return;
    const mainChurchAmount = Number(churchPaymentForm.mainChurchAmount || 0);
    const conferenceAmount = Number(churchPaymentForm.conferenceAmount || 0);
    if ((!Number.isFinite(mainChurchAmount) || mainChurchAmount <= 0) && (!Number.isFinite(conferenceAmount) || conferenceAmount <= 0)) {
      setErr('Enter Main Church or Conference amount');
      return;
    }

    setSavingChurchPayment(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/church/${id}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          month: churchPaymentForm.month,
          mainChurchAmount,
          conferenceAmount,
          paidAt: churchPaymentForm.paidAt || undefined,
          note: churchPaymentForm.note,
        }),
      });
      setChurchPaymentForm((prev) => ({
        ...prev,
        mainChurchAmount: '',
        conferenceAmount: '',
        paidAt: '',
        note: '',
      }));
      await loadDetails();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to record remittance payment');
    } finally {
      setSavingChurchPayment(false);
    }
  };

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-7xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Finance</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Remittance Details</h1>
        </div>
        <Link href="/dashboard/superadmin/finance/remittances" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
          Back to Remittances
        </Link>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {busy ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-violet-600" />
        </div>
      ) : null}

      {kind === 'church' && churchData ? (
        <>
          {(() => {
            const monthlyRows = (churchData.monthlyRows && churchData.monthlyRows.length > 0)
              ? churchData.monthlyRows
              : churchData.selectedMonth
                ? [churchData.selectedMonth]
                : [];
            return (
              <>
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-neutral-500">Church</p>
            <p className="text-lg font-semibold text-neutral-900">{churchData.row.churchName}</p>
            <p className="mt-1 text-xs text-neutral-600">Selected Month: {churchData.monthKey} · Conference: {churchData.row.conferenceName}</p>
          </div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Lifetime Summary</div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Total Income</p><p className="mt-1 text-xl font-semibold">USD {(churchData.lifetimeSummary?.totalIncome ?? churchData.row.totalIncome).toFixed(2)}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Total Due</p><p className="mt-1 text-xl font-semibold">USD {(churchData.lifetimeSummary?.totalDue ?? churchData.row.mainChurch.due + churchData.row.conference.due).toFixed(2)}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Total Balance</p><p className="mt-1 text-xl font-semibold text-rose-800">USD {(churchData.lifetimeSummary?.totalBalance ?? churchData.row.mainChurch.balance + churchData.row.conference.balance).toFixed(2)}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Payment Status</p><span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${statusClass(churchData.lifetimeSummary?.paymentStatus || churchData.row.paymentStatus || 'PENDING')}`}>{statusLabel(churchData.lifetimeSummary?.paymentStatus || churchData.row.paymentStatus || 'PENDING')}</span></div>
          </div>
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">Pay Remit</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs text-neutral-700">
                Month
                <input type="month" value={churchPaymentForm.month} onChange={(e) => setChurchPaymentForm((s) => ({ ...s, month: e.target.value }))} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-neutral-700">
                Main Church Amount
                <input type="number" min="0" step="0.01" value={churchPaymentForm.mainChurchAmount} onChange={(e) => setChurchPaymentForm((s) => ({ ...s, mainChurchAmount: e.target.value }))} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-neutral-700">
                Conference Amount
                <input type="number" min="0" step="0.01" value={churchPaymentForm.conferenceAmount} onChange={(e) => setChurchPaymentForm((s) => ({ ...s, conferenceAmount: e.target.value }))} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-neutral-700">
                Paid At
                <input type="date" value={churchPaymentForm.paidAt} onChange={(e) => setChurchPaymentForm((s) => ({ ...s, paidAt: e.target.value }))} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-neutral-700">
                Note
                <input type="text" value={churchPaymentForm.note} onChange={(e) => setChurchPaymentForm((s) => ({ ...s, note: e.target.value }))} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" placeholder="Optional note" />
              </label>
            </div>
            <div className="mt-3">
              <button type="button" onClick={submitChurchPayment} disabled={savingChurchPayment} className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60">
                {savingChurchPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
          <div className="mb-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2"><h2 className="text-sm font-semibold text-neutral-900">Monthly Remittance Status (Due + Paid + Balance)</h2></div>
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-right">Income</th>
                  <th className="px-3 py-2 text-right">Main Due</th>
                  <th className="px-3 py-2 text-right">Main Paid</th>
                  <th className="px-3 py-2 text-right">Main Balance</th>
                  <th className="px-3 py-2 text-right">Conf Due</th>
                  <th className="px-3 py-2 text-right">Conf Paid</th>
                  <th className="px-3 py-2 text-right">Conf Balance</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.length === 0 ? (
                  <tr className="border-t border-neutral-100">
                    <td className="px-3 py-4 text-center text-neutral-500" colSpan={9}>No monthly remittance data found yet.</td>
                  </tr>
                ) : monthlyRows.map((m) => (
                  <tr key={m.monthKey} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-medium">{m.monthKey}</td>
                    <td className="px-3 py-2 text-right tabular-nums">USD {m.totalIncome.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">USD {m.mainChurch.due.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">USD {m.mainChurch.paid.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-800">USD {m.mainChurch.balance.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">USD {m.conference.due.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">USD {m.conference.paid.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-800">USD {m.conference.balance.toFixed(2)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(m.paymentStatus || 'PENDING')}`}>{statusLabel(m.paymentStatus || 'PENDING')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2"><h2 className="text-sm font-semibold text-neutral-900">All Lifetime Church Remittance Payments</h2></div>
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-neutral-50 text-neutral-700"><tr><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Paid At</th><th className="px-3 py-2 text-left">Added By</th><th className="px-3 py-2 text-left">Added At</th><th className="px-3 py-2 text-left">Note</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
              <tbody>
                {(churchData.lifetimeEntries || churchData.row.entries).map((e) => {
                  const isEditing = editingChurchEntryId === e.id;
                  return (
                    <tr key={e.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2">{e.monthKey || churchData.monthKey}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={churchEntryEdit.remitType}
                            onChange={(ev) => setChurchEntryEdit((prev) => ({ ...prev, remitType: ev.target.value }))}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs"
                          >
                            <option value="MAIN_CHURCH">MAIN_CHURCH</option>
                            <option value="CONFERENCE">CONFERENCE</option>
                          </select>
                        ) : (
                          e.remitType
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={churchEntryEdit.amount}
                            onChange={(ev) => setChurchEntryEdit((prev) => ({ ...prev, amount: ev.target.value }))}
                            className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-right text-xs"
                          />
                        ) : (
                          <>USD {e.amount.toFixed(2)}</>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={churchEntryEdit.paidAt}
                            onChange={(ev) => setChurchEntryEdit((prev) => ({ ...prev, paidAt: ev.target.value }))}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                          />
                        ) : (
                          e.paidAt ? new Date(e.paidAt).toLocaleDateString() : '—'
                        )}
                      </td>
                      <td className="px-3 py-2">{e.createdByName || 'System'}</td>
                      <td className="px-3 py-2">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-xs text-neutral-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={churchEntryEdit.note}
                            onChange={(ev) => setChurchEntryEdit((prev) => ({ ...prev, note: ev.target.value }))}
                            className="w-full min-w-[180px] rounded-md border border-neutral-300 px-2 py-1 text-xs"
                            placeholder="Note"
                          />
                        ) : (
                          e.note || '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={saveChurchEntryEdit}
                              disabled={savingChurchEntry}
                              className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingChurchEntry ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelChurchEntryEdit}
                              disabled={savingChurchEntry}
                              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startChurchEntryEdit(e)}
                            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
              </>
            );
          })()}
        </>
      ) : null}

      {kind === 'school' && schoolData ? (
        <>
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-neutral-500">School</p>
            <p className="text-lg font-semibold text-neutral-900">{schoolData.row.schoolName}</p>
            <p className="mt-1 text-xs text-neutral-600">Year: {schoolData.year}</p>
            <p className="mt-2 text-xs text-neutral-700">{schoolData.row.contactPerson || 'No contact'} · {schoolData.row.phone || 'No phone'} · {schoolData.row.email || 'No email'}</p>
            <p className="text-xs text-neutral-700">{schoolData.row.address || 'No address'}</p>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Total Due</p><p className="mt-1 text-xl font-semibold">USD {schoolData.row.totalDue.toFixed(2)}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Total Paid</p><p className="mt-1 text-xl font-semibold text-emerald-800">USD {schoolData.row.totalPaid.toFixed(2)}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">Status</p><span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${statusClass(schoolData.row.paymentStatus || 'PENDING')}`}>{statusLabel(schoolData.row.paymentStatus || 'PENDING')}</span></div>
          </div>
          <div className="mb-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2"><h2 className="text-sm font-semibold text-neutral-900">All Dues</h2></div>
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-neutral-50 text-neutral-700"><tr><th className="px-3 py-2 text-left">Label</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-right">Due</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Due Date</th></tr></thead>
              <tbody>{schoolData.row.dues.map((d) => <tr key={d.id} className="border-t border-neutral-100"><td className="px-3 py-2">{d.label}</td><td className="px-3 py-2">{d.termKey || '—'}</td><td className="px-3 py-2 text-right tabular-nums">{d.dueAmount.toFixed(2)}</td><td className="px-3 py-2 text-right tabular-nums">{d.paidAmount.toFixed(2)}</td><td className="px-3 py-2 text-right tabular-nums">{d.balance.toFixed(2)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(d.status)}`}>{statusLabel(d.status)}</span></td><td className="px-3 py-2">{d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2"><h2 className="text-sm font-semibold text-neutral-900">All Payments</h2></div>
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-neutral-50 text-neutral-700"><tr><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Paid At</th><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-left">Reference</th><th className="px-3 py-2 text-left">Added By</th><th className="px-3 py-2 text-left">Note</th></tr></thead>
              <tbody>{schoolData.row.payments.map((p) => <tr key={p.id} className="border-t border-neutral-100"><td className="px-3 py-2 text-right tabular-nums">USD {p.amount.toFixed(2)}</td><td className="px-3 py-2">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td><td className="px-3 py-2">{p.paymentMethod || '—'}</td><td className="px-3 py-2">{p.referenceNo || '—'}</td><td className="px-3 py-2">{p.createdByName || 'System'}</td><td className="px-3 py-2 text-xs text-neutral-700">{p.note || '—'}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

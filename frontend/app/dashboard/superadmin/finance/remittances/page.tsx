'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

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
    createdByName?: string;
  }>;
};
type ChurchPayload = { monthKey: string; rows: ChurchRow[] };
type SchoolDue = {
  id: string;
  label: string;
  termKey?: string;
  dueAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate: string | null;
  note?: string;
};
type SchoolPayment = { id: string; dueId: string | null; amount: number; paidAt: string | null; paymentMethod: string; referenceNo: string };
type SchoolRow = {
  schoolId: string; schoolName: string; contactPerson: string; phone: string; email: string; address: string; note: string;
  totalDue: number; totalPaid: number; totalBalance: number; dues: SchoolDue[]; payments: SchoolPayment[]; paymentStatus?: string;
};
type SchoolPayload = { year: number; rows: SchoolRow[] };
type HistoryRow = {
  id: string;
  scope: string;
  action: string;
  at: string | null;
  actor: string;
  entity: string;
  details: string;
};

const nowMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function SuperadminRemittancesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'CHURCH' | 'SCHOOL' | 'HISTORY'>('CHURCH');
  const [month, setMonth] = useState(nowMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [churchData, setChurchData] = useState<ChurchPayload | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolPayload | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [churchForm, setChurchForm] = useState({ churchId: '', mainChurchAmount: '', conferenceAmount: '', paidAt: '', note: '' });
  const [schoolForm, setSchoolForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', note: '' });
  const [dueForm, setDueForm] = useState({ schoolId: '', label: '', termKey: 'TERM_1', dueAmount: '', dueDate: '' });
  const [payForm, setPayForm] = useState({ schoolId: '', dueId: '', amount: '', paidAt: '', paymentMethod: '', referenceNo: '', note: '' });
  const [expandedChurchId, setExpandedChurchId] = useState('');
  const [expandedSchoolId, setExpandedSchoolId] = useState('');
  const [editingChurchEntryId, setEditingChurchEntryId] = useState('');
  const [churchEntryEdit, setChurchEntryEdit] = useState({ remitType: 'MAIN_CHURCH', amount: '', paidAt: '', note: '' });
  const [editingSchoolId, setEditingSchoolId] = useState('');
  const [schoolEdit, setSchoolEdit] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', note: '' });
  const [editingDueId, setEditingDueId] = useState('');
  const [dueEdit, setDueEdit] = useState({ label: '', termKey: 'TERM_1', dueAmount: '', dueDate: '', note: '' });

  const loadChurch = async (targetMonth = month) => {
    if (!token) return;
    const q = new URLSearchParams({ month: targetMonth });
    const data = await apiFetch<ChurchPayload>(`/api/superadmin/finance/remittances/church?${q.toString()}`, { token });
    setChurchData(data);
  };
  const loadSchool = async (targetYear = year) => {
    if (!token) return;
    const q = new URLSearchParams({ year: targetYear });
    const data = await apiFetch<SchoolPayload>(`/api/superadmin/finance/remittances/schools?${q.toString()}`, { token });
    setSchoolData(data);
  };
  const loadHistory = async () => {
    if (!token) return;
    const data = await apiFetch<{ rows: HistoryRow[] }>('/api/superadmin/finance/remittances/history?limit=500', { token });
    setHistoryRows(data.rows || []);
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      setBusy(true);
      Promise.all([loadChurch(), loadSchool(), loadHistory()])
        .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load remittance data'))
        .finally(() => setBusy(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  const churchOptions = churchData?.rows || [];
  const selectedSchool = useMemo(
    () => (schoolData?.rows || []).find((s) => s.schoolId === payForm.schoolId),
    [schoolData, payForm.schoolId]
  );
  const churchTotals = useMemo(() => {
    return churchOptions.reduce(
      (acc, row) => {
        acc.income += row.totalIncome;
        acc.mainDue += row.mainChurch.due;
        acc.mainPaid += row.mainChurch.paid;
        acc.confDue += row.conference.due;
        acc.confPaid += row.conference.paid;
        return acc;
      },
      { income: 0, mainDue: 0, mainPaid: 0, confDue: 0, confPaid: 0 }
    );
  }, [churchOptions]);
  const schoolTotals = useMemo(() => {
    return (schoolData?.rows || []).reduce(
      (acc, row) => {
        acc.totalDue += row.totalDue;
        acc.totalPaid += row.totalPaid;
        acc.totalBalance += row.totalBalance;
        return acc;
      },
      { totalDue: 0, totalPaid: 0, totalBalance: 0 }
    );
  }, [schoolData]);

  async function submitChurchRemit() {
    if (!token) return;
    if (!churchForm.churchId) return setErr('Select church');
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/church/${churchForm.churchId}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          month,
          mainChurchAmount: Number(churchForm.mainChurchAmount || 0),
          conferenceAmount: Number(churchForm.conferenceAmount || 0),
          paidAt: churchForm.paidAt || undefined,
          note: churchForm.note,
        }),
      });
      setChurchForm((s) => ({ ...s, mainChurchAmount: '', conferenceAmount: '', paidAt: '', note: '' }));
      await Promise.all([loadChurch(month), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save church remit');
    } finally {
      setBusy(false);
    }
  }

  async function createSchool() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/finance/remittances/schools', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: schoolForm.name,
          contactPerson: schoolForm.contactPerson,
          phone: schoolForm.phone,
          email: schoolForm.email,
          address: schoolForm.address,
          note: schoolForm.note,
        }),
      });
      setSchoolForm({ name: '', contactPerson: '', phone: '', email: '', address: '', note: '' });
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add school');
    } finally {
      setBusy(false);
    }
  }

  async function addSchoolDue() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/schools/${dueForm.schoolId}/dues`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          year: Number(year),
          label: dueForm.label,
          termKey: dueForm.termKey,
          dueAmount: Number(dueForm.dueAmount),
          dueDate: dueForm.dueDate || undefined,
        }),
      });
      setDueForm((s) => ({ ...s, label: '', dueAmount: '', dueDate: '' }));
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add due');
    } finally {
      setBusy(false);
    }
  }

  async function addSchoolPayment() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/schools/${payForm.schoolId}/payments`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          dueId: payForm.dueId || undefined,
          amount: Number(payForm.amount),
          paidAt: payForm.paidAt || undefined,
          paymentMethod: payForm.paymentMethod,
          referenceNo: payForm.referenceNo,
          note: payForm.note,
        }),
      });
      setPayForm((s) => ({ ...s, dueId: '', amount: '', paidAt: '', paymentMethod: '', referenceNo: '', note: '' }));
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add payment');
    } finally {
      setBusy(false);
    }
  }

  async function saveChurchEntryEdit() {
    if (!token || !editingChurchEntryId) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = await apiFetch<ChurchPayload>(`/api/superadmin/finance/remittances/church/entries/${editingChurchEntryId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          remitType: churchEntryEdit.remitType,
          amount: Number(churchEntryEdit.amount),
          paidAt: churchEntryEdit.paidAt || undefined,
          note: churchEntryEdit.note,
        }),
      });
      setChurchData(payload);
      setEditingChurchEntryId('');
      setChurchEntryEdit({ remitType: 'MAIN_CHURCH', amount: '', paidAt: '', note: '' });
      await loadHistory();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update remittance entry');
    } finally {
      setBusy(false);
    }
  }

  async function saveSchoolEdit() {
    if (!token || !editingSchoolId) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/schools/${editingSchoolId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(schoolEdit),
      });
      setEditingSchoolId('');
      setSchoolEdit({ name: '', contactPerson: '', phone: '', email: '', address: '', note: '' });
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update school');
    } finally {
      setBusy(false);
    }
  }

  async function saveDueEdit() {
    if (!token || !editingDueId) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/schools/dues/${editingDueId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          label: dueEdit.label,
          termKey: dueEdit.termKey,
          dueAmount: Number(dueEdit.dueAmount),
          dueDate: dueEdit.dueDate || undefined,
          note: dueEdit.note,
        }),
      });
      setEditingDueId('');
      setDueEdit({ label: '', termKey: 'TERM_1', dueAmount: '', dueDate: '', note: '' });
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update due');
    } finally {
      setBusy(false);
    }
  }

  const statusClass = (status: string) => {
    if (status === 'PAID') return 'bg-emerald-100 text-emerald-800';
    if (status === 'PARTIAL') return 'bg-amber-100 text-amber-800';
    if (status === 'NO_DUE') return 'bg-neutral-100 text-neutral-700';
    return 'bg-rose-100 text-rose-800';
  };
  const statusLabel = (status: string) => (status === 'PARTIAL' ? 'PARTIALLY_PAID' : status);

  async function deleteChurchEntry(entryId: string) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = await apiFetch<ChurchPayload>(`/api/superadmin/finance/remittances/church/entries/${entryId}`, {
        method: 'DELETE',
        token,
      });
      setChurchData(payload);
      setEditingChurchEntryId('');
      await loadHistory();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete remittance entry');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDue(dueId: string) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/schools/dues/${dueId}`, {
        method: 'DELETE',
        token,
      });
      setEditingDueId('');
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete due');
    } finally {
      setBusy(false);
    }
  }

  async function deletePayment(paymentId: string) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/finance/remittances/schools/payments/${paymentId}`, {
        method: 'DELETE',
        token,
      });
      await Promise.all([loadSchool(year), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete payment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-7xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Remittances</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Manage monthly church remits and school remits in one place.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('CHURCH')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === 'CHURCH' ? 'bg-violet-100 text-violet-900' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Church Remit
        </button>
        <button
          type="button"
          onClick={() => setTab('SCHOOL')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === 'SCHOOL' ? 'bg-violet-100 text-violet-900' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          School Remit
        </button>
        <button
          type="button"
          onClick={() => setTab('HISTORY')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === 'HISTORY' ? 'bg-violet-100 text-violet-900' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          History
        </button>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {busy && !churchData && !schoolData ? (
        <div className="mb-6 flex justify-center py-8">
          <Loader2 className="size-8 animate-spin text-violet-600" />
        </div>
      ) : null}

      {tab === 'CHURCH' ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Total church income</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">USD {churchTotals.income.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Main church due</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">USD {churchTotals.mainDue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Main church paid</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">USD {churchTotals.mainPaid.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Conference due</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">USD {churchTotals.confDue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Conference paid</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">USD {churchTotals.confPaid.toFixed(2)}</p>
            </div>
          </div>

          <div className="mb-4 flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
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
              onClick={() => void loadChurch(month)}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Apply
            </button>
          </div>

          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Record Church Remit</h2>
            <p className="mt-1 text-xs text-neutral-600">Enter how much the church has paid for this month.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <select
                value={churchForm.churchId}
                onChange={(e) => setChurchForm((s) => ({ ...s, churchId: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Select church</option>
                {churchOptions.map((c) => (
                  <option key={c.churchId} value={c.churchId}>
                    {c.churchName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Main church paid"
                value={churchForm.mainChurchAmount}
                onChange={(e) => setChurchForm((s) => ({ ...s, mainChurchAmount: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Conference paid"
                value={churchForm.conferenceAmount}
                onChange={(e) => setChurchForm((s) => ({ ...s, conferenceAmount: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={churchForm.paidAt}
                onChange={(e) => setChurchForm((s) => ({ ...s, paidAt: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Note"
                value={churchForm.note}
                onChange={(e) => setChurchForm((s) => ({ ...s, note: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <button
              type="button"
              onClick={() => void submitChurchRemit()}
              className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Record Church Remit
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-neutral-900">Church Remit Details</h2>
            </div>
            <table className="w-full min-w-[1150px] text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Church</th>
                  <th className="px-3 py-2 text-right font-medium">Income</th>
                  <th className="px-3 py-2 text-right font-medium">Main Due</th>
                  <th className="px-3 py-2 text-right font-medium">Main Paid</th>
                  <th className="px-3 py-2 text-right font-medium">Main Balance</th>
                  <th className="px-3 py-2 text-left font-medium">Main Status</th>
                  <th className="px-3 py-2 text-right font-medium">Conference Due</th>
                  <th className="px-3 py-2 text-right font-medium">Conference Paid</th>
                  <th className="px-3 py-2 text-right font-medium">Conference Balance</th>
                  <th className="px-3 py-2 text-left font-medium">Conference Status</th>
                  <th className="px-3 py-2 text-left font-medium">Payment Status</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {churchOptions.map((r) => (
                  <React.Fragment key={r.churchId}>
                    <tr className="border-t border-neutral-100">
                      <td className="px-3 py-2">
                        <p className="font-medium text-neutral-900">{r.churchName}</p>
                        <p className="text-xs text-neutral-500">
                          Main: {r.mainChurch.recipientName} · Conf: {r.conference.recipientName}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.totalIncome.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mainChurch.due.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-800">{r.mainChurch.paid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-800">{r.mainChurch.balance.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(r.mainChurch.status)}`}>
                          {statusLabel(r.mainChurch.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.conference.due.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-800">{r.conference.paid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-800">{r.conference.balance.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(r.conference.status)}`}>
                          {statusLabel(r.conference.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(r.paymentStatus || 'PENDING')}`}>
                          {statusLabel(r.paymentStatus || 'PENDING')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/superadmin/finance/remittances/view?kind=church&id=${r.churchId}&month=${month}`
                              )
                            }
                            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedChurchId === r.churchId ? (
                      <tr className="border-t border-neutral-100 bg-neutral-50/40">
                        <td colSpan={12} className="px-3 py-3">
                          <p className="mb-2 text-xs font-semibold text-neutral-700">Remittance entries</p>
                          <div className="space-y-2">
                            {r.entries.length === 0 ? <p className="text-xs text-neutral-500">No entries yet.</p> : null}
                            {r.entries.map((entry) => (
                              <div key={entry.id} className="rounded border border-neutral-200 bg-white p-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-neutral-800">
                                    {entry.remitType} · USD {entry.amount.toFixed(2)} · {entry.paidAt ? new Date(entry.paidAt).toLocaleDateString() : 'No date'}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingChurchEntryId(entry.id);
                                        setChurchEntryEdit({
                                          remitType: entry.remitType || 'MAIN_CHURCH',
                                          amount: String(entry.amount || ''),
                                          paidAt: entry.paidAt ? new Date(entry.paidAt).toISOString().slice(0, 10) : '',
                                          note: entry.note || '',
                                        });
                                      }}
                                      className="rounded border border-violet-200 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteChurchEntry(entry.id)}
                                      className="rounded border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <p className="mt-1 text-neutral-600">{entry.note || 'No note'}</p>
                                {editingChurchEntryId === entry.id ? (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                                    <select
                                      value={churchEntryEdit.remitType}
                                      onChange={(e) => setChurchEntryEdit((s) => ({ ...s, remitType: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                    >
                                      <option value="MAIN_CHURCH">MAIN_CHURCH</option>
                                      <option value="CONFERENCE">CONFERENCE</option>
                                    </select>
                                    <input
                                      type="number"
                                      value={churchEntryEdit.amount}
                                      onChange={(e) => setChurchEntryEdit((s) => ({ ...s, amount: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                      placeholder="Amount"
                                    />
                                    <input
                                      type="date"
                                      value={churchEntryEdit.paidAt}
                                      onChange={(e) => setChurchEntryEdit((s) => ({ ...s, paidAt: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                    />
                                    <input
                                      value={churchEntryEdit.note}
                                      onChange={(e) => setChurchEntryEdit((s) => ({ ...s, note: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                      placeholder="Note"
                                    />
                                    <div className="sm:col-span-4 flex gap-2">
                                      <button type="button" onClick={() => void saveChurchEntryEdit()} className="rounded bg-violet-600 px-3 py-1 text-white">Save</button>
                                      <button type="button" onClick={() => setEditingChurchEntryId('')} className="rounded border border-neutral-300 px-3 py-1">Cancel</button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === 'SCHOOL' ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Total due</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">USD {schoolTotals.totalDue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Total paid</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">USD {schoolTotals.totalPaid.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Balance</p>
              <p className="mt-1 text-xl font-semibold text-rose-800">USD {schoolTotals.totalBalance.toFixed(2)}</p>
            </div>
          </div>

          <div className="mb-4 flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Year</span>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadSchool(year)}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Apply
            </button>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Add School</h2>
              <p className="mt-1 text-xs text-neutral-600">Save school details once, then select in pay form.</p>
              <div className="mt-3 grid gap-3">
                <input
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="School name"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={schoolForm.contactPerson}
                  onChange={(e) => setSchoolForm((s) => ({ ...s, contactPerson: e.target.value }))}
                  placeholder="Contact person"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="Phone"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={schoolForm.email}
                  onChange={(e) => setSchoolForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm((s) => ({ ...s, address: e.target.value }))}
                  placeholder="Address"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={schoolForm.note}
                  onChange={(e) => setSchoolForm((s) => ({ ...s, note: e.target.value }))}
                  placeholder="School note"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void createSchool()}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Add School
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Add Due</h2>
              <p className="mt-1 text-xs text-neutral-600">Create term dues for selected school.</p>
              <div className="mt-3 grid gap-3">
                <select
                  value={dueForm.schoolId}
                  onChange={(e) => setDueForm((s) => ({ ...s, schoolId: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">School for due</option>
                  {(schoolData?.rows || []).map((s) => (
                    <option key={s.schoolId} value={s.schoolId}>
                      {s.schoolName}
                    </option>
                  ))}
                </select>
                <select
                  value={dueForm.termKey}
                  onChange={(e) => setDueForm((s) => ({ ...s, termKey: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="TERM_1">Term 1</option>
                  <option value="TERM_2">Term 2</option>
                  <option value="TERM_3">Term 3</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                <input
                  value={dueForm.label}
                  onChange={(e) => setDueForm((s) => ({ ...s, label: e.target.value }))}
                  placeholder="Due label"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={dueForm.dueAmount}
                  onChange={(e) => setDueForm((s) => ({ ...s, dueAmount: e.target.value }))}
                  placeholder="Due amount"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={dueForm.dueDate}
                  onChange={(e) => setDueForm((s) => ({ ...s, dueDate: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void addSchoolDue()}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
                >
                  Add Due
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Pay Remit</h2>
              <p className="mt-1 text-xs text-neutral-600">.. saved school details and record payment.</p>
              <div className="mt-3 grid gap-3">
                <select
                  value={payForm.schoolId}
                  onChange={(e) => setPayForm((s) => ({ ...s, schoolId: e.target.value, dueId: '' }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">School for payment</option>
                  {(schoolData?.rows || []).map((s) => (
                    <option key={s.schoolId} value={s.schoolId}>
                      {s.schoolName}
                    </option>
                  ))}
                </select>
                <select
                  value={payForm.dueId}
                  onChange={(e) => setPayForm((s) => ({ ...s, dueId: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Allocate to due (optional)</option>
                  {(selectedSchool?.dues || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} - {d.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((s) => ({ ...s, amount: e.target.value }))}
                  placeholder="Pay amount"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={payForm.paidAt}
                  onChange={(e) => setPayForm((s) => ({ ...s, paidAt: e.target.value }))}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm((s) => ({ ...s, paymentMethod: e.target.value }))}
                  placeholder="Payment method"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={payForm.referenceNo}
                  onChange={(e) => setPayForm((s) => ({ ...s, referenceNo: e.target.value }))}
                  placeholder="Reference no"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={payForm.note}
                  onChange={(e) => setPayForm((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Note"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void addSchoolPayment()}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Pay School Remit
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-neutral-900">School Remit Details</h2>
            </div>
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 text-left">School</th>
                  <th className="px-3 py-2 text-left">Contact</th>
                  <th className="px-3 py-2 text-right">Total Due</th>
                  <th className="px-3 py-2 text-right">Total Paid</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-left">Payment Status</th>
                  <th className="px-3 py-2 text-left">Dues (3 terms/year)</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(schoolData?.rows || []).map((r) => (
                  <React.Fragment key={r.schoolId}>
                    <tr className="border-t border-neutral-100">
                      <td className="px-3 py-2">
                        <p className="font-medium text-neutral-900">{r.schoolName}</p>
                        <p className="text-xs text-neutral-500">{r.address || 'No address'}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-700">
                        {r.contactPerson || 'No contact'}
                        <div>{r.phone || 'No phone'}</div>
                        <div>{r.email || 'No email'}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.totalDue.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-800">{r.totalPaid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-800">{r.totalBalance.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(r.paymentStatus || 'PENDING')}`}>
                          {statusLabel(r.paymentStatus || 'PENDING')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-700">
                        {r.dues.map((d) => `${d.label}: ${d.paidAmount.toFixed(2)}/${d.dueAmount.toFixed(2)} (${d.status})`).join(' | ') || 'No dues'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/superadmin/finance/remittances/view?kind=school&id=${r.schoolId}&year=${year}`
                              )
                            }
                            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSchoolId(r.schoolId);
                              setSchoolEdit({
                                name: r.schoolName || '',
                                contactPerson: r.contactPerson || '',
                                phone: r.phone || '',
                                email: r.email || '',
                                address: r.address || '',
                                note: r.note || '',
                              });
                            }}
                            className="rounded border border-violet-200 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedSchoolId === r.schoolId ? (
                      <tr className="border-t border-neutral-100 bg-neutral-50/40">
                        <td colSpan={8} className="px-3 py-3">
                          <p className="mb-1 text-xs font-semibold text-neutral-700">Dues</p>
                          <div className="space-y-2">
                            {r.dues.length === 0 ? <p className="text-xs text-neutral-600">No dues</p> : null}
                            {r.dues.map((d) => (
                              <div key={d.id} className="rounded border border-neutral-200 bg-white p-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-neutral-700">
                                    {d.label}: {d.paidAmount.toFixed(2)}/{d.dueAmount.toFixed(2)} ({d.status})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDueId(d.id);
                                      setDueEdit({
                                        label: d.label || '',
                                        termKey: d.termKey || 'TERM_1',
                                        dueAmount: String(d.dueAmount || ''),
                                        dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0, 10) : '',
                                        note: d.note || '',
                                      });
                                    }}
                                    className="rounded border border-violet-200 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
                                  >
                                    Edit Due
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteDue(d.id)}
                                    className="rounded border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                                  >
                                    Delete Due
                                  </button>
                                </div>
                                {editingDueId === d.id ? (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-5">
                                    <input
                                      value={dueEdit.label}
                                      onChange={(e) => setDueEdit((s) => ({ ...s, label: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                      placeholder="Label"
                                    />
                                    <select
                                      value={dueEdit.termKey}
                                      onChange={(e) => setDueEdit((s) => ({ ...s, termKey: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                    >
                                      <option value="TERM_1">TERM_1</option>
                                      <option value="TERM_2">TERM_2</option>
                                      <option value="TERM_3">TERM_3</option>
                                      <option value="CUSTOM">CUSTOM</option>
                                    </select>
                                    <input
                                      type="number"
                                      value={dueEdit.dueAmount}
                                      onChange={(e) => setDueEdit((s) => ({ ...s, dueAmount: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                      placeholder="Due amount"
                                    />
                                    <input
                                      type="date"
                                      value={dueEdit.dueDate}
                                      onChange={(e) => setDueEdit((s) => ({ ...s, dueDate: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                    />
                                    <input
                                      value={dueEdit.note}
                                      onChange={(e) => setDueEdit((s) => ({ ...s, note: e.target.value }))}
                                      className="rounded border border-neutral-300 px-2 py-1"
                                      placeholder="Note"
                                    />
                                    <div className="sm:col-span-5 flex gap-2">
                                      <button type="button" onClick={() => void saveDueEdit()} className="rounded bg-violet-600 px-3 py-1 text-white">Save Due</button>
                                      <button type="button" onClick={() => setEditingDueId('')} className="rounded border border-neutral-300 px-3 py-1">Cancel</button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          <p className="mb-1 mt-2 text-xs font-semibold text-neutral-700">Payments</p>
                          <div className="space-y-2">
                            {r.payments.length === 0 ? <p className="text-xs text-neutral-600">No payments</p> : null}
                            {r.payments.map((p) => (
                              <div key={p.id} className="rounded border border-neutral-200 bg-white p-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-neutral-700">
                                    USD {p.amount.toFixed(2)} on {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'No date'} ({p.paymentMethod || 'No method'})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void deletePayment(p.id)}
                                    className="rounded border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                                  >
                                    Delete Payment
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {editingSchoolId === r.schoolId ? (
                      <tr className="border-t border-neutral-100 bg-violet-50/40">
                        <td colSpan={8} className="px-3 py-3">
                          <p className="mb-2 text-xs font-semibold text-violet-800">Edit school details</p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <input value={schoolEdit.name} onChange={(e) => setSchoolEdit((s) => ({ ...s, name: e.target.value }))} className="rounded border border-neutral-300 px-2 py-1 text-sm" placeholder="School name" />
                            <input value={schoolEdit.contactPerson} onChange={(e) => setSchoolEdit((s) => ({ ...s, contactPerson: e.target.value }))} className="rounded border border-neutral-300 px-2 py-1 text-sm" placeholder="Contact person" />
                            <input value={schoolEdit.phone} onChange={(e) => setSchoolEdit((s) => ({ ...s, phone: e.target.value }))} className="rounded border border-neutral-300 px-2 py-1 text-sm" placeholder="Phone" />
                            <input value={schoolEdit.email} onChange={(e) => setSchoolEdit((s) => ({ ...s, email: e.target.value }))} className="rounded border border-neutral-300 px-2 py-1 text-sm" placeholder="Email" />
                            <input value={schoolEdit.address} onChange={(e) => setSchoolEdit((s) => ({ ...s, address: e.target.value }))} className="rounded border border-neutral-300 px-2 py-1 text-sm" placeholder="Address" />
                            <input value={schoolEdit.note} onChange={(e) => setSchoolEdit((s) => ({ ...s, note: e.target.value }))} className="rounded border border-neutral-300 px-2 py-1 text-sm" placeholder="Note" />
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => void saveSchoolEdit()} className="rounded bg-violet-600 px-3 py-1 text-xs font-medium text-white">Save</button>
                            <button type="button" onClick={() => setEditingSchoolId('')} className="rounded border border-neutral-300 px-3 py-1 text-xs">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2">
            <h2 className="text-sm font-semibold text-neutral-900">Remittance History</h2>
            <p className="text-xs text-neutral-600">Shows who added/updated school, due, and payment records.</p>
          </div>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Scope</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Entity</th>
                <th className="px-3 py-2 text-left">By</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 text-xs text-neutral-700">
                    {row.at ? new Date(row.at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">{row.scope}</td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2">{row.entity}</td>
                  <td className="px-3 py-2">{row.actor}</td>
                  <td className="px-3 py-2 text-xs text-neutral-700">{row.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-500">No history rows yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

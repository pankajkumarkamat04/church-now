'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Eye, Loader2, Plus, XCircle } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import {
  createLedgerAccount,
  fetchAccountTransactions,
  fetchJournalEntries,
  fetchLedgerAccounts,
  formatUsd,
  rejectJournalEntry,
  verifyJournalEntry,
} from '@/lib/accounting';
import type { JournalEntry, LedgerAccount } from '@/lib/accountingTypes';
import { hasTreasurerPrivileges } from '@/app/dashboard/admin/payments/_lib/treasurer-shared';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminLedgerPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [accountTx, setAccountTx] = useState<JournalEntry[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'Asset',
    accountCategory: 'Current Assets',
    openingBalance: '0',
    description: '',
  });
  const canManage = hasTreasurerPrivileges(user);

  const load = useCallback(async () => {
    if (!token) return;
    const [acc, je] = await Promise.all([
      fetchLedgerAccounts(token, 'admin'),
      fetchJournalEntries(token, 'admin'),
    ]);
    setAccounts(acc);
    setEntries(je);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load ledger'));
    }
  }, [user, token, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      await createLedgerAccount(token, {
        ...form,
        openingBalance: Number(form.openingBalance || 0),
      });
      setShowCreate(false);
      setForm({ accountCode: '', accountName: '', accountType: 'Asset', accountCategory: 'Current Assets', openingBalance: '0', description: '' });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setBusy(false);
    }
  }

  async function openAccountTx(account: LedgerAccount) {
    if (!token) return;
    setSelectedAccount(account);
    const tx = await fetchAccountTransactions(token, account._id, 'admin');
    setAccountTx(tx);
  }

  async function onVerify(entryId: string) {
    if (!token || !canManage) return;
    setBusy(true);
    try {
      await verifyJournalEntry(token, entryId);
      await load();
      if (selectedAccount) await openAccountTx(selectedAccount);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Verify failed');
    } finally {
      setBusy(false);
    }
  }

  async function onReject(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !rejectId || !canManage) return;
    setBusy(true);
    try {
      await rejectJournalEntry(token, rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  }

  const draftEntries = entries.filter((e) => e.status === 'Draft' || e.status === 'Pending Authorization');

  return (
    <div className="dashboard-page w-full min-w-0">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Accounting</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">General Ledger</h1>
          <p className="mt-1 text-sm text-neutral-600">Double-entry accounts with verify-before-post workflow.</p>
        </div>
        {canManage ? (
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            <Plus className="size-4" /> New account
          </button>
        ) : null}
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.slice(0, 4).map((acc) => (
          <div key={acc._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">{acc.accountCode} · {acc.accountType}</p>
            <p className="mt-1 font-medium text-neutral-900">{acc.accountName}</p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">{formatUsd(acc.balance)}</p>
            {acc.pendingBalance ? <p className="text-xs text-amber-700">Pending: {formatUsd(acc.pendingBalance)}</p> : null}
          </div>
        ))}
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="font-semibold text-neutral-900">Chart of accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc._id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-mono">{acc.accountCode}</td>
                  <td className="px-4 py-2">{acc.accountName}</td>
                  <td className="px-4 py-2">{acc.accountType}</td>
                  <td className="px-4 py-2">{formatUsd(acc.balance)}</td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => openAccountTx(acc)} className="inline-flex items-center gap-1 text-sky-700 hover:underline">
                      <Eye className="size-4" /> Transactions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="font-semibold text-neutral-900">Pending verification ({draftEntries.length})</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {draftEntries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-500">No draft journal entries.</p>
          ) : (
            draftEntries.map((entry) => (
              <div key={entry._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-neutral-900">{entry.entryNumber} · {entry.referenceType}</p>
                  <p className="text-sm text-neutral-600">{entry.description}</p>
                  <p className="text-xs text-neutral-500">{new Date(entry.entryDate).toLocaleDateString()} · {formatUsd(entry.totalDebit)}</p>
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={() => onVerify(entry._id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
                      <CheckCircle className="size-4" /> Verify
                    </button>
                    <button type="button" disabled={busy} onClick={() => setRejectId(entry._id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="size-4" /> Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onCreate} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900">New ledger account</h3>
            <div className="mt-4 space-y-3">
              <input className={field} placeholder="Account code" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} required />
              <input className={field} placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} required />
              <select className={field} value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
                {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={field} placeholder="Category" value={form.accountCategory} onChange={(e) => setForm({ ...form, accountCategory: e.target.value })} />
              <input className={field} type="number" step="0.01" placeholder="Opening balance" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
              <textarea className={field} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50">{busy ? 'Saving…' : 'Create'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedAccount.accountName} ({selectedAccount.accountCode})</h3>
              <button type="button" onClick={() => setSelectedAccount(null)} className="text-sm text-neutral-600 hover:text-neutral-900">Close</button>
            </div>
            <div className="space-y-3">
              {accountTx.map((tx) => (
                <div key={tx._id} className="rounded-lg border border-neutral-200 p-3">
                  <p className="font-medium">{tx.entryNumber} · {tx.status}</p>
                  <p className="text-sm text-neutral-600">{tx.description}</p>
                  {tx.lines.filter((l) => l.accountCode === selectedAccount.accountCode).map((line, i) => (
                    <p key={i} className="text-xs text-neutral-500">Dr {line.debit} · Cr {line.credit}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onReject} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Reject transaction</h3>
            <textarea className={`${field} mt-3`} placeholder="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="rounded-lg px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Reject</button>
            </div>
          </form>
        </div>
      ) : null}

      {busy ? (
        <div className="fixed bottom-4 right-4 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
          <Loader2 className="inline size-4 animate-spin" /> Working…
        </div>
      ) : null}
    </div>
  );
}

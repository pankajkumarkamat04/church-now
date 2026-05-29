'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { SuperadminChurchFilter } from '@/components/finance/SuperadminChurchFilter';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAccountTransactions, fetchJournalEntries, fetchLedgerAccounts, formatUsd } from '@/lib/accounting';
import type { JournalEntry, LedgerAccount } from '@/lib/accountingTypes';

export default function SuperadminLedgerPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churchId, setChurchId] = useState('');
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [accountTx, setAccountTx] = useState<JournalEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !churchId) return;
    setBusy(true);
    try {
      const [acc, je] = await Promise.all([
        fetchLedgerAccounts(token, 'superadmin', churchId),
        fetchJournalEntries(token, 'superadmin', churchId),
      ]);
      setAccounts(acc);
      setEntries(je);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setBusy(false);
    }
  }, [token, churchId]);

  useEffect(() => {
    if (!loading && (!user || !['SUPERADMIN', 'CHURCH_ADMIN'].includes(user.role))) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (token && churchId) load();
  }, [token, churchId, load]);

  async function openAccountTx(account: LedgerAccount) {
    if (!token || !churchId) return;
    setSelectedAccount(account);
    const tx = await fetchAccountTransactions(token, account._id, 'superadmin', churchId);
    setAccountTx(tx);
  }

  const draftEntries = entries.filter((e) => e.status === 'Draft' || e.status === 'Pending Authorization');

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">General Ledger</h1>
        <p className="text-sm text-neutral-600">Read-only congregation ledger view.</p>
      </div>
      <SuperadminChurchFilter token={token} value={churchId} onChange={setChurchId} />
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {churchId ? (
        <>
          <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Balance</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc._id} className="border-t">
                    <td className="px-4 py-2 font-mono">{acc.accountCode}</td>
                    <td className="px-4 py-2">{acc.accountName}</td>
                    <td className="px-4 py-2">{formatUsd(acc.balance)}</td>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => openAccountTx(acc)} className="text-violet-700 hover:underline"><Eye className="inline size-4" /> View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">Pending ({draftEntries.length})</h2>
            {draftEntries.map((e) => (
              <div key={e._id} className="border-t py-2 text-sm">
                <p className="font-medium">{e.entryNumber} · {formatUsd(e.totalDebit)}</p>
                <p className="text-neutral-600">{e.description}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {selectedAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6">
            <button type="button" className="mb-3 text-sm text-neutral-600" onClick={() => setSelectedAccount(null)}>Close</button>
            <h3 className="font-semibold">{selectedAccount.accountName}</h3>
            {accountTx.map((tx) => (
              <div key={tx._id} className="mt-2 rounded border p-2 text-sm">{tx.entryNumber} · {tx.status} · {tx.description}</div>
            ))}
          </div>
        </div>
      ) : null}
      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}
    </div>
  );
}

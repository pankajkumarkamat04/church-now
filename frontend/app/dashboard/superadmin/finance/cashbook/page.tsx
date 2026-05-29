'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { SuperadminChurchFilter } from '@/components/finance/SuperadminChurchFilter';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCashBookSummary, fetchJournalEntries, formatUsd } from '@/lib/accounting';
import type { JournalEntry } from '@/lib/accountingTypes';

export default function SuperadminCashBookPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churchId, setChurchId] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [summary, setSummary] = useState({ cashInHand: 0, cashAtBank: 0, total: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !churchId) return;
    setBusy(true);
    try {
      const [rawEntries, cashSummary] = await Promise.all([
        fetchJournalEntries(token, 'superadmin', churchId),
        fetchCashBookSummary(token, 'superadmin', churchId),
      ]);
      const cashCodes = new Set(['1000', '1100']);
      setEntries(rawEntries.filter((e) => e.lines.some((l) => cashCodes.has(l.accountCode))));
      setSummary(cashSummary);
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

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <h1 className="mb-2 text-2xl font-semibold">Cash Book</h1>
      <SuperadminChurchFilter token={token} value={churchId} onChange={setChurchId} />
      {churchId ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Cash in hand</p><p className="text-xl font-semibold">{formatUsd(summary.cashInHand)}</p></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Cash at bank</p><p className="text-xl font-semibold">{formatUsd(summary.cashAtBank)}</p></div>
            <div className="rounded-xl border bg-emerald-100 p-4"><p className="text-xs">Total</p><p className="text-xl font-semibold">{formatUsd(summary.total)}</p></div>
          </div>
          <div className="rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50"><tr><th className="px-4 py-2 text-left">Entry</th><th className="px-4 py-2 text-left">Description</th><th className="px-4 py-2 text-left">Amount</th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e._id} className="border-t"><td className="px-4 py-2 font-mono text-xs">{e.entryNumber}</td><td className="px-4 py-2">{e.description}</td><td className="px-4 py-2">{formatUsd(e.totalDebit)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}
    </div>
  );
}

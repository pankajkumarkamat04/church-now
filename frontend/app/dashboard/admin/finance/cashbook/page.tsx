'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCashBookSummary, fetchJournalEntries, fetchLedgerAccounts, formatUsd } from '@/lib/accounting';
import type { JournalEntry } from '@/lib/accountingTypes';

export default function AdminCashBookPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [summary, setSummary] = useState({ cashInHand: 0, cashAtBank: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const [accounts, rawEntries, cashSummary] = await Promise.all([
        fetchLedgerAccounts(token, 'admin'),
        fetchJournalEntries(token, 'admin'),
        fetchCashBookSummary(token, 'admin'),
      ]);
      const cashCodes = new Set(['1000', '1100']);
      const processed = rawEntries.filter((entry) =>
        entry.lines.some((line) => cashCodes.has(line.accountCode))
      );
      setEntries(processed);
      if (cashSummary) {
        setSummary(cashSummary);
      } else {
        const cashInHand = accounts.find((a) => a.accountCode === '1000')?.balance || 0;
        const cashAtBank = accounts.find((a) => a.accountCode === '1100')?.balance || 0;
        setSummary({ cashInHand, cashAtBank, total: cashInHand + cashAtBank });
      }
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load cash book'));
    }
  }, [user, token, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.entryNumber.toLowerCase().includes(q) ||
        String(e.referenceType || '').toLowerCase().includes(q)
    );
  }, [entries, search]);

  function cashFlow(entry: JournalEntry) {
    const cashLine = entry.lines.find((l) => l.accountCode === '1000' || l.accountCode === '1100');
    if (!cashLine) return { type: 'neutral' as const, amount: 0 };
    if (cashLine.debit > 0) return { type: 'in' as const, amount: cashLine.debit };
    return { type: 'out' as const, amount: cashLine.credit };
  }

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Accounting</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">Cash Book</h1>
          <p className="mt-1 text-sm text-neutral-600">Cash and bank movements from verified ledger entries.</p>
        </div>
        <button type="button" onClick={() => load()} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">
          <RefreshCcw className="size-4" /> Refresh
        </button>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-medium text-neutral-500"><Wallet className="size-4" /> Cash in hand</p>
          <p className="mt-2 text-2xl font-semibold">{formatUsd(summary.cashInHand)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">Cash at bank</p>
          <p className="mt-2 text-2xl font-semibold">{formatUsd(summary.cashAtBank)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-800">Total cash position</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatUsd(summary.total)}</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          placeholder="Search by description or entry number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Entry</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">In</th>
                <th className="px-4 py-2 font-medium">Out</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const flow = cashFlow(entry);
                return (
                  <tr key={entry._id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(entry.entryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-mono text-xs">{entry.entryNumber}</td>
                    <td className="px-4 py-2">{entry.description}</td>
                    <td className="px-4 py-2">{entry.referenceType}</td>
                    <td className="px-4 py-2 text-emerald-700">
                      {flow.type === 'in' ? (
                        <span className="inline-flex items-center gap-1"><TrendingUp className="size-3" /> {formatUsd(flow.amount)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-red-700">
                      {flow.type === 'out' ? (
                        <span className="inline-flex items-center gap-1"><TrendingDown className="size-3" /> {formatUsd(flow.amount)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${entry.status === 'Posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !busy ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No cash transactions yet.</p>
        ) : null}
      </div>

      {busy ? (
        <div className="mt-4 flex justify-center">
          <Loader2 className="size-6 animate-spin text-sky-600" />
        </div>
      ) : null}
    </div>
  );
}

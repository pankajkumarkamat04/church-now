'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import {
  DISPLAY_CURRENCY_OPTIONS,
  type DisplayCurrency,
  fetchPublicCurrencyRates,
  normalizeDisplayCurrencyInput,
  type PublicCurrencyRates,
  usdToDisplayAmount,
} from '@/lib/currency';

export type FinanceTx = {
  id: string;
  kind: string;
  paymentType: string;
  paymentWay: string;
  amount: number;
  currency: string;
  displayCurrency?: string;
  fxUsdPerUnit?: number | null;
  amountDisplayTotal?: number | null;
  date: string | null;
  party: string;
  description: string;
  status: string;
  reference: string;
  churchId: string | null;
  churchName: string | null;
};

type Summary = {
  churchId: string | null;
  from: string | null;
  to: string | null;
  byCurrency: Record<
    string,
    { payments: number; expenses: number; incomeTotal: number; net: number }
  >;
  counts: { payments: number; expenses: number };
  transactions: FinanceTx[];
  transactionMeta: { total: number; returned: number; truncated: boolean };
};

const KINDS = [
  { id: 'PAYMENT', label: 'Payment' },
  { id: 'EXPENSE', label: 'Expense' },
] as const;

const PIE_COLORS = ['#0ea5e9', '#10b981', '#a855f7', '#f97316'];

type Props = {
  variant: 'admin' | 'superadmin';
  /** Superadmin: church list for optional filter */
  churches?: { _id: string; name: string }[];
};

export function FinanceReportsClient({ variant, churches = [] }: Props) {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churchId, setChurchId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kindToggles, setKindToggles] = useState<Record<string, boolean>>({
    PAYMENT: true,
    EXPENSE: true,
  });
  const [search, setSearch] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');
  const [rates, setRates] = useState<PublicCurrencyRates | null>(null);

  const btnClass =
    variant === 'admin'
      ? 'inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60'
      : 'inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60';
  const spinClass = variant === 'admin' ? 'text-sky-600' : 'text-violet-600';
  const labelClass = variant === 'admin' ? 'text-sky-700' : 'text-violet-700';

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (variant === 'superadmin' && churchId) q.set('churchId', churchId);
      const qs = q.toString();
      const path = variant === 'admin' ? '/api/admin/finance/summary' : '/api/superadmin/finance/summary';
      const s = await apiFetch<Summary>(`${path}${qs ? `?${qs}` : ''}`, { token });
      setSummary(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setBusy(false);
    }
  }, [token, from, to, churchId, variant]);

  useEffect(() => {
    fetchPublicCurrencyRates()
      .then(setRates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (variant === 'admin' && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
    if (variant === 'superadmin' && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [variant, user, loading, router]);

  useEffect(() => {
    if (!user || !token) return;
    if (variant === 'admin' && user.role !== 'ADMIN') return;
    if (variant === 'superadmin' && user.role !== 'SUPERADMIN') return;
    void fetchSummary();
    // Only load on auth readiness; use Apply to refetch with new dates / church.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, variant]);

  const filteredRows = useMemo(() => {
    const rows = summary?.transactions || [];
    return rows.filter((r) => {
      if (!kindToggles[r.kind]) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        r.party.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.paymentWay.toLowerCase().includes(q) ||
        r.paymentType.toLowerCase().includes(q) ||
        (r.churchName && r.churchName.toLowerCase().includes(q)) ||
        (r.status && r.status.toLowerCase().includes(q))
      );
    });
  }, [summary, kindToggles, search]);

  const amountBarData = useMemo(() => {
    const m: Record<string, number> = { PAYMENT: 0, EXPENSE: 0 };
    for (const r of filteredRows) {
      const amt =
        rates && displayCurrency !== 'USD'
          ? usdToDisplayAmount(r.amount, displayCurrency, rates.foreignPerUsd)
          : r.amount;
      m[r.kind] = (m[r.kind] || 0) + amt;
    }
    return KINDS.map((k) => ({
      name: k.label,
      amount: m[k.id] ?? 0,
      kind: k.id,
    })).filter((d) => kindToggles[d.kind]);
  }, [filteredRows, displayCurrency, kindToggles, rates]);

  const summaryForDisplay = useMemo(() => {
    const usd = summary?.byCurrency?.USD;
    if (!usd) return summary?.byCurrency || {};
    if (!rates || displayCurrency === 'USD') {
      return { USD: usd };
    }
    const mul = rates.foreignPerUsd[displayCurrency];
    if (!mul || !Number.isFinite(mul)) {
      return { USD: usd };
    }
    return {
      [displayCurrency]: {
        payments: usd.payments * mul,
        expenses: usd.expenses * mul,
        incomeTotal: usd.incomeTotal * mul,
        net: usd.net * mul,
      },
    };
  }, [summary, displayCurrency, rates]);

  const countPieData = useMemo(() => {
    const m: Record<string, number> = { PAYMENT: 0, EXPENSE: 0 };
    for (const r of filteredRows) {
      m[r.kind] = (m[r.kind] || 0) + 1;
    }
    return KINDS.filter((k) => kindToggles[k.id]).map((k) => ({
      name: k.label,
      value: m[k.id] ?? 0,
    }));
  }, [filteredRows, kindToggles]);

  const showChurchCol = variant === 'superadmin' && !churchId;

  if (!user || (variant === 'admin' && user.role !== 'ADMIN') || (variant === 'superadmin' && user.role !== 'SUPERADMIN')) {
    return null;
  }

  return (
    <div className="w-full min-w-0 max-w-7xl">
      <FinanceSectionNav variant={variant} />
      <div className="mb-6">
        <p className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}>Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Detailed payment lines with type and channel. Use filters, then review charts and the full table. Dates apply to
          payment / expense dates.
        </p>
      </div>

      <div className="mb-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {variant === 'superadmin' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Church (optional)</label>
              <select
                value={churchId}
                onChange={(e) => setChurchId(e.target.value)}
                className="w-full min-w-0 sm:min-w-[200px] sm:max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">All churches</option>
                {churches.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="button" onClick={() => void fetchSummary()} disabled={busy} className={btnClass}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-600">Table &amp; chart filters (client)</p>
          <div className="flex flex-wrap gap-3">
            {KINDS.map((k) => (
              <label key={k.id} className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={kindToggles[k.id] ?? true}
                  onChange={(e) => setKindToggles((s) => ({ ...s, [k.id]: e.target.checked }))}
                />
                {k.label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Party, description, type…"
                className="w-full min-w-0 sm:min-w-[200px] sm:max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Display currency (stored USD)</label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(normalizeDisplayCurrencyInput(e.target.value))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                {DISPLAY_CURRENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {busy && !summary ? (
        <div className="flex justify-center py-12">
          <Loader2 className={`size-8 animate-spin ${spinClass}`} />
        </div>
      ) : summary ? (
        <>
          <p className="mb-2 text-sm text-neutral-600">
            {summary.churchId
              ? 'Single church'
              : variant === 'superadmin'
                ? 'All churches'
                : 'Your church'}
            {' — '}
            {summary.from || summary.to ? `${summary.from || '—'} to ${summary.to || '—'}` : 'all dates'}
            {summary.transactionMeta?.truncated ? (
              <span className="ml-2 text-amber-800">
                (Loaded {summary.transactionMeta.returned} of {summary.transactionMeta.total} rows; narrow the date range
                for full export.)
              </span>
            ) : null}
          </p>

          <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">Amount by payment type ({displayCurrency})</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Converted from USD totals using current rates (dashboard display).</p>
              <div className="mt-2 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amountBarData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="text-neutral-200" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : v)} />
                    <Bar
                      dataKey="amount"
                      name={`Amount (${displayCurrency})`}
                      fill={variant === 'admin' ? '#0ea5e9' : '#7c3aed'}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">Transactions by type (count)</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Uses the same table filters (search + type checks).</p>
              <div className="mt-2 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={countPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {countPieData.map((_, i) => (
                        <Cell key={String(i)} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-neutral-900">Totals (amounts stored in USD)</h2>
              <p className="text-xs text-neutral-500">Figures below use the selected display currency when not USD.</p>
            </div>
            <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-neutral-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Currency</th>
                    <th className="px-4 py-2 font-medium">Payments (income)</th>
                    <th className="px-4 py-2 font-medium">Expenses</th>
                    <th className="px-4 py-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summaryForDisplay).map(([cur, v]) => (
                    <tr key={cur} className="border-t border-neutral-100">
                      <td className="px-4 py-2 font-medium">{cur}</td>
                      <td className="px-4 py-2 text-emerald-800">{v.incomeTotal.toFixed(2)}</td>
                      <td className="px-4 py-2 text-orange-800">{v.expenses.toFixed(2)}</td>
                      <td className={`px-4 py-2 font-medium ${variant === 'admin' ? 'text-sky-900' : 'text-violet-900'}`}>
                        {v.net.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            {Object.keys(summaryForDisplay).length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-500">No summary totals in this range.</p>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-neutral-900">All payment &amp; expense lines</h2>
              <p className="text-xs text-neutral-500">
                Showing {filteredRows.length} row(s) after filters. Raw rows from server: {summary.transactionMeta?.returned}
                {summary.transactionMeta && summary.transactionMeta.total !== summary.transactionMeta.returned
                  ? ` of ${summary.transactionMeta.total}`
                  : ''}
                .
              </p>
            </div>
            <div className="max-h-[min(70vh,720px)] overflow-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-sm text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    {showChurchCol ? <th className="px-3 py-2 font-medium">Church</th> : null}
                    <th className="px-3 py-2 font-medium">Payment type</th>
                    <th className="px-3 py-2 font-medium">Payment way / channel</th>
                    <th className="px-3 py-2 font-medium">Party / payee</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Status / source</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Currency</th>
                    <th className="px-3 py-2 font-mono text-xs font-medium">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50/80">
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-800">
                        {r.date ? new Date(r.date).toLocaleString() : '—'}
                      </td>
                      {showChurchCol ? (
                        <td className="max-w-[140px] truncate px-3 py-2 text-neutral-700" title={r.churchName || ''}>
                          {r.churchName || '—'}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 font-medium text-neutral-900">{r.paymentType}</td>
                      <td className="max-w-[180px] px-3 py-2 text-neutral-700" title={r.paymentWay}>
                        {r.paymentWay}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-neutral-800" title={r.party}>
                        {r.party}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-neutral-600" title={r.description}>
                        {r.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-600">{r.status}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          r.kind === 'EXPENSE' ? 'text-orange-800' : 'text-emerald-900'
                        }`}
                      >
                        {r.kind === 'EXPENSE' ? '−' : ''}
                        {(rates && displayCurrency !== 'USD'
                          ? usdToDisplayAmount(r.amount, displayCurrency, rates.foreignPerUsd)
                          : r.amount
                        ).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{displayCurrency}</td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-500">{r.reference.slice(0, 12)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No rows match the current filters.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

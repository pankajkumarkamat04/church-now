'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, Loader2, Table2 } from 'lucide-react';
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
import { PAYMENT_OPTIONS, type PaymentOption } from '@/lib/payments';
import {
  downloadFinanceReportPdf,
  downloadFinanceReportSpreadsheet,
  type FinanceReportExportInput,
} from '@/lib/financeReportExport';
import type { FinanceTx } from '@/lib/financeTypes';

export type { FinanceTx } from '@/lib/financeTypes';

function emptyPaymentOptionTotals(): Record<PaymentOption, number> {
  return Object.fromEntries(PAYMENT_OPTIONS.map((k) => [k, 0])) as Record<PaymentOption, number>;
}

function addBreakdownToTotals(
  totals: Record<PaymentOption, number>,
  breakdown: Array<{ paymentType: string; amount: number }> | null | undefined
) {
  if (!breakdown?.length) return;
  for (const line of breakdown) {
    const key = String(line.paymentType || '').trim().toUpperCase();
    if (key && key in totals) {
      totals[key as PaymentOption] += Number(line.amount) || 0;
    }
  }
}

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

function exportPeriodText(s: Summary): string {
  if (!s.from && !s.to) return 'All dates';
  const a = s.from
    ? new Date(`${s.from}T12:00:00`).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '…';
  const b = s.to
    ? new Date(`${s.to}T12:00:00`).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '…';
  return `${a} → ${b}`;
}

function exportScopeLabel(
  s: Summary,
  variant: 'admin' | 'superadmin',
  churches: { _id: string; name: string }[]
): string {
  if (s.churchId && churches.length) {
    const id = String(s.churchId);
    const c = churches.find((x) => String(x._id) === id);
    if (c?.name) return c.name;
  }
  if (s.churchId) return 'Single congregation';
  return variant === 'superadmin' ? 'All churches' : 'Your congregation';
}

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
  const exportBtnClass =
    variant === 'admin'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-900 shadow-sm hover:bg-sky-50 disabled:opacity-40'
      : 'inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-900 shadow-sm hover:bg-violet-50 disabled:opacity-40';

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

  const incomeMatrix = useMemo(() => {
    if (!kindToggles.PAYMENT) {
      return { rows: [], columnTotals: emptyPaymentOptionTotals(), grandTotal: 0 };
    }
    const payRows = (filteredRows || []).filter((r) => r.kind === 'PAYMENT');
    const byKey = new Map<
      string,
      { party: string; churchName: string | null; totals: Record<PaymentOption, number> }
    >();
    for (const r of payRows) {
      const ck =
        variant === 'superadmin' && showChurchCol
          ? `${r.churchId || r.churchName || ''}::${String(r.party || '').trim()}`
          : String(r.party || '').trim();
      if (!byKey.has(ck)) {
        byKey.set(ck, {
          party: String(r.party || '').trim() || '—',
          churchName: r.churchName || null,
          totals: emptyPaymentOptionTotals(),
        });
      }
      const agg = byKey.get(ck)!;
      addBreakdownToTotals(agg.totals, r.paymentLineBreakdown);
    }

    const sorted = [...byKey.values()].sort((a, b) => {
      const ca = String(a.churchName || '').localeCompare(String(b.churchName || ''), undefined, {
        sensitivity: 'base',
      });
      if (ca !== 0) return ca;
      return a.party.localeCompare(b.party, undefined, { sensitivity: 'base' });
    });

    const rows = sorted.map((row) => {
      let rowTotal = 0;
      for (const opt of PAYMENT_OPTIONS) rowTotal += row.totals[opt];
      return { ...row, rowTotal };
    });

    const columnTotals = emptyPaymentOptionTotals();
    let grandTotal = 0;
    for (const row of rows) {
      for (const opt of PAYMENT_OPTIONS) {
        columnTotals[opt] += row.totals[opt];
      }
      grandTotal += row.rowTotal;
    }

    return { rows, columnTotals, grandTotal };
  }, [filteredRows, kindToggles.PAYMENT, variant, showChurchCol]);

  /** Expenditure grouped by expense category (`paymentWay` on expense lines), USD. */
  const expenditureByCategory = useMemo(() => {
    if (!kindToggles.EXPENSE) {
      return { rows: [], totalUsd: 0 };
    }
    const m = new Map<string, number>();
    for (const r of filteredRows) {
      if (r.kind !== 'EXPENSE') continue;
      const cat = String(r.paymentWay || 'General').trim() || 'General';
      m.set(cat, (m.get(cat) || 0) + (Number(r.amount) || 0));
    }
    const rows = [...m.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => String(a.category).localeCompare(String(b.category), undefined, { sensitivity: 'base' }));
    const totalUsd = rows.reduce((s, row) => s + row.amount, 0);
    return { rows, totalUsd };
  }, [filteredRows, kindToggles.EXPENSE]);

  const getAmountDisplay = useCallback(
    (r: FinanceTx) => {
      if (rates && displayCurrency !== 'USD') {
        return usdToDisplayAmount(r.amount, displayCurrency, rates.foreignPerUsd);
      }
      return r.amount;
    },
    [rates, displayCurrency]
  );

  const financeExportPayload = useMemo((): FinanceReportExportInput | null => {
    if (!summary) return null;
    return {
      variant,
      scopeLabel: exportScopeLabel(summary, variant, churches),
      periodText: exportPeriodText(summary),
      displayCurrency,
      showChurchCol,
      paymentOptions: PAYMENT_OPTIONS,
      incomeIncluded: kindToggles.PAYMENT ?? true,
      incomeMatrix,
      expenseIncluded: kindToggles.EXPENSE ?? true,
      expenditureByCategory,
      summaryForDisplay,
      transactionRows: filteredRows,
      getAmountDisplay,
    };
  }, [
    summary,
    variant,
    churches,
    displayCurrency,
    showChurchCol,
    kindToggles.PAYMENT,
    kindToggles.EXPENSE,
    incomeMatrix,
    expenditureByCategory,
    summaryForDisplay,
    filteredRows,
    getAmountDisplay,
  ]);

  if (!user || (variant === 'admin' && user.role !== 'ADMIN') || (variant === 'superadmin' && user.role !== 'SUPERADMIN')) {
    return null;
  }

  function formatUsdAnalysis(n: number) {
    if (!Number.isFinite(n)) return '—';
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
    return rounded.toFixed(2);
  }

  return (
    <div className="w-full min-w-0 max-w-7xl">
      <FinanceSectionNav variant={variant} />
      <div className="mb-6">
        <p className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}>Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Reports</h1>
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
          <p className="mb-2 text-xs font-medium text-neutral-600">Filters</p>
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
              <label className="mb-1 block text-xs font-medium text-neutral-600">Display currency</label>
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
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
            <span className="mr-1 text-xs font-medium text-neutral-600">Export</span>
            <button
              type="button"
              className={exportBtnClass}
              disabled={busy || !financeExportPayload}
              onClick={() => {
                if (financeExportPayload) downloadFinanceReportPdf(financeExportPayload);
              }}
            >
              <FileDown className="size-3.5 shrink-0" aria-hidden />
              Download PDF
            </button>
            <button
              type="button"
              className={exportBtnClass}
              disabled={busy || !financeExportPayload}
              onClick={() => {
                if (financeExportPayload) downloadFinanceReportSpreadsheet(financeExportPayload);
              }}
            >
              <Table2 className="size-3.5 shrink-0" aria-hidden />
              Download spreadsheet (.xlsx)
            </button>
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
                ({summary.transactionMeta.returned}/{summary.transactionMeta.total} rows loaded.)
              </span>
            ) : null}
          </p>

          {kindToggles.PAYMENT ? (
            <div
              className={
                variant === 'admin'
                  ? 'mb-8 overflow-x-auto rounded-xl border-2 border-sky-800 bg-white shadow-lg'
                  : 'mb-8 overflow-x-auto rounded-xl border-2 border-neutral-800 bg-white shadow-lg'
              }
            >
              <div
                className={
                  variant === 'admin'
                    ? 'border-b border-sky-200 bg-sky-50 px-4 py-3'
                    : 'border-b border-neutral-200 bg-neutral-100 px-4 py-3'
                }
              >
                <h2 className="text-base font-bold text-neutral-900">Income by payer (USD)</h2>
                <p className="mt-1 text-xs font-medium text-neutral-600">{exportPeriodText(summary)}</p>
              </div>
              {incomeMatrix.rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-neutral-500">
                  No payment rows in range (enable <strong>Payment</strong> above, or widen dates / church scope).
                </p>
              ) : (
                <table className="w-full min-w-[1100px] border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-300 bg-white">
                      <th className="sticky left-0 z-10 border-r border-neutral-200 bg-white px-3 py-2 font-semibold text-neutral-900">
                        Payer / member
                      </th>
                      {showChurchCol ? (
                        <th className="min-w-[140px] border-r border-neutral-200 px-2 py-2 font-semibold text-neutral-900">
                          Church
                        </th>
                      ) : null}
                      {PAYMENT_OPTIONS.map((opt) => (
                        <th
                          key={opt}
                          className="whitespace-nowrap px-1 py-2 text-center text-[11px] font-bold uppercase tracking-tight text-neutral-800"
                        >
                          {opt}
                        </th>
                      ))}
                      <th className="whitespace-nowrap border-l border-neutral-200 px-3 py-2 text-right font-bold uppercase text-neutral-900">
                        Total USD
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeMatrix.rows.map((row) => (
                      <tr
                        key={`${row.churchName ?? ''}:${row.party}`}
                        className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50/80"
                      >
                        <td className="sticky left-0 z-10 max-w-[220px] border-r border-neutral-100 bg-[inherit] px-3 py-1.5 font-medium text-neutral-900">
                          {row.party}
                        </td>
                        {showChurchCol ? (
                          <td className="max-w-[140px] border-r border-neutral-100 px-2 py-1.5 text-neutral-700">
                            {row.churchName || '—'}
                          </td>
                        ) : null}
                        {PAYMENT_OPTIONS.map((opt) => {
                          const v = row.totals[opt];
                          return (
                            <td key={opt} className="whitespace-nowrap px-1 py-1.5 text-right tabular-nums text-neutral-800">
                              {formatUsdAnalysis(v)}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap border-l border-neutral-200 px-3 py-1.5 text-right font-semibold tabular-nums text-neutral-900">
                          {formatUsdAnalysis(row.rowTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      className={
                        variant === 'admin' ? 'bg-sky-950 text-white' : 'bg-neutral-900 text-white'
                      }
                    >
                      <td
                        colSpan={showChurchCol ? 2 : 1}
                        className="sticky left-0 z-10 px-3 py-2.5 font-bold uppercase tracking-wide"
                      >
                        Total income USD
                      </td>
                      {PAYMENT_OPTIONS.map((opt) => (
                        <td key={opt} className="whitespace-nowrap px-1 py-2.5 text-right text-sm font-bold tabular-nums">
                          {formatUsdAnalysis(incomeMatrix.columnTotals[opt])}
                        </td>
                      ))}
                      <td className="whitespace-nowrap border-l border-white/20 px-3 py-2.5 text-right text-base font-bold tabular-nums">
                        {formatUsdAnalysis(incomeMatrix.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ) : null}

          {kindToggles.EXPENSE ? (
            <div
              className={
                variant === 'admin'
                  ? 'mb-8 overflow-x-auto rounded-xl border border-sky-300 bg-white shadow-sm'
                  : 'mb-8 overflow-x-auto rounded-xl border border-neutral-300 bg-white shadow-sm'
              }
            >
              <div
                className={
                  variant === 'admin' ? 'border-b border-sky-100 bg-sky-50/80 px-4 py-2' : 'border-b border-neutral-100 bg-neutral-50 px-4 py-2'
                }
              >
                <h2 className="text-sm font-semibold text-neutral-900">Expenditure by category (USD)</h2>
              </div>
              {expenditureByCategory.rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-neutral-500">No expenses in range.</p>
              ) : (
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-neutral-600">
                    <tr>
                      <th className="border-b border-neutral-200 px-4 py-2 text-left font-medium">Category</th>
                      <th className="border-b border-neutral-200 px-4 py-2 text-right font-medium">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenditureByCategory.rows.map((row) => (
                      <tr key={row.category} className="border-t border-neutral-100">
                        <td className="px-4 py-2">{row.category}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-orange-900">{formatUsdAnalysis(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-100 font-semibold text-neutral-900">
                      <td className="px-4 py-2">Total expenditure USD</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatUsdAnalysis(expenditureByCategory.totalUsd)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ) : null}

          {variant === 'admin' ? (
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
          ) : null}

          <div className="mb-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-neutral-900">Totals (USD)</h2>
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
              <h2 className="text-sm font-semibold text-neutral-900">Payment &amp; expense lines</h2>
              <p className="text-xs text-neutral-500">
                {filteredRows.length} rows · Server {summary.transactionMeta?.returned}
                {summary.transactionMeta && summary.transactionMeta.total !== summary.transactionMeta.returned
                  ? ` / ${summary.transactionMeta.total}`
                  : ''}
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

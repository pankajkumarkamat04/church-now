'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Search, Wallet } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchGlobalPaymentMembers,
  fetchMemberFinancialSummary,
  formatUsd,
  recordGlobalDeposit,
  recordGlobalPayment,
} from '@/lib/accounting';
import { PAYMENT_METHODS, type GlobalPaymentMember } from '@/lib/accountingTypes';
import { emptyAmountsForCodes, useAdminPaymentTypes } from '@/lib/paymentTypes';
import {
  DISPLAY_CURRENCY_OPTIONS,
  type DisplayCurrency,
  fetchPublicCurrencyRates,
  type PublicCurrencyRates,
} from '@/lib/currency';
import {
  hasTreasurerPrivileges,
  memberDropdownLabel,
} from '@/app/dashboard/admin/payments/_lib/treasurer-shared';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminGlobalPaymentsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<GlobalPaymentMember[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchMemberFinancialSummary>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [tab, setTab] = useState<'deposit' | 'pay'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Cash');
  const [payMethod, setPayMethod] = useState('Wallet');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');
  const [rates, setRates] = useState<PublicCurrencyRates | null>(null);
  const [note, setNote] = useState('');
  const { activeCodes, labels } = useAdminPaymentTypes(token);
  const [amountsByOption, setAmountsByOption] = useState<Record<string, string>>({});
  const canManage = hasTreasurerPrivileges(user);

  useEffect(() => {
    fetchPublicCurrencyRates().then(setRates).catch(() => null);
  }, []);

  useEffect(() => {
    if (activeCodes.length) setAmountsByOption(emptyAmountsForCodes(activeCodes));
  }, [activeCodes.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMembers = useCallback(async () => {
    if (!token) return;
    const rows = await fetchGlobalPaymentMembers(token, 'admin', search.trim() || undefined);
    setMembers(rows);
    if (!selectedId && rows[0]) setSelectedId(rows[0]._id);
  }, [token, search, selectedId]);

  const loadSummary = useCallback(async () => {
    if (!token || !selectedId) return;
    const data = await fetchMemberFinancialSummary(token, selectedId, 'admin');
    setSummary(data);
  }, [token, selectedId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      loadMembers().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load members'));
    }
  }, [user, token, loadMembers]);

  useEffect(() => {
    if (token && selectedId) {
      loadSummary().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load summary'));
    }
  }, [token, selectedId, loadSummary]);

  const selectedMember = useMemo(
    () => members.find((m) => m._id === selectedId) || summary?.member,
    [members, selectedId, summary]
  );

  async function onDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedId || !canManage) return;
    setBusy(true);
    setErr(null);
    setReceiptNumber(null);
    try {
      const res = await recordGlobalDeposit(token, selectedId, {
        amount: Number(depositAmount),
        displayCurrency,
        paymentMethod: depositMethod,
      });
      setReceiptNumber(res.receiptNumber || null);
      setDepositAmount('');
      await loadSummary();
      await loadMembers();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Deposit failed');
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedId || !canManage) return;
    setBusy(true);
    setErr(null);
    setReceiptNumber(null);
    try {
      const res = await recordGlobalPayment(token, selectedId, {
        amountsByOption,
        displayCurrency,
        paymentMethod: payMethod,
        note,
      });
      setReceiptNumber(res.receiptNumber || null);
      setNote('');
      if (activeCodes.length) setAmountsByOption(emptyAmountsForCodes(activeCodes));
      await loadSummary();
      await loadMembers();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Accounting</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">Global Payments</h1>
        <p className="mt-1 text-sm text-neutral-600">Search members, record deposits and offerings with ledger receipts. Uses the same congregation payment flow as Pay on behalf and Balances.</p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {receiptNumber ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Receipt / journal entry: <strong>{receiptNumber}</strong> (verify in Ledger to post balances)
        </p>
      ) : null}

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            className={`${field} pl-9`}
            placeholder="Search by name, email, or member ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMembers()}
          />
        </div>
        <button type="button" onClick={() => loadMembers()} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Search</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-4 py-3 font-medium">Members</div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-100">
            {members.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => setSelectedId(m._id)}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 ${selectedId === m._id ? 'bg-sky-50' : ''}`}
              >
                <p className="font-medium text-neutral-900">{memberDropdownLabel(m)}</p>
                <p className="text-xs text-neutral-500">Balance {formatUsd(m.walletBalance)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {selectedMember ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Wallet</p><p className="text-xl font-semibold">{formatUsd(summary?.summary.walletBalance ?? selectedMember.walletBalance)}</p></div>
              <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Total deposited</p><p className="text-xl font-semibold">{formatUsd(summary?.summary.totalDeposited ?? 0)}</p></div>
              <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Total paid</p><p className="text-xl font-semibold">{formatUsd(summary?.summary.totalPaid ?? 0)}</p></div>
            </div>
          ) : null}

          {canManage ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex gap-2">
                <button type="button" onClick={() => setTab('deposit')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'deposit' ? 'bg-sky-100 text-sky-900' : 'text-neutral-600'}`}>
                  <Wallet className="mr-1 inline size-4" /> Deposit
                </button>
                <button type="button" onClick={() => setTab('pay')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'pay' ? 'bg-sky-100 text-sky-900' : 'text-neutral-600'}`}>
                  <CreditCard className="mr-1 inline size-4" /> Record payment
                </button>
              </div>

              <select className={`${field} mb-3 max-w-xs`} value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrency)}>
                {DISPLAY_CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>

              {tab === 'deposit' ? (
                <form onSubmit={onDeposit} className="space-y-3">
                  <input className={field} type="number" step="0.01" min="0" placeholder="Deposit amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
                  <select className={field} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
                    {PAYMENT_METHODS.filter((m) => m !== 'Wallet').map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50">Record deposit</button>
                </form>
              ) : (
                <form onSubmit={onPay} className="space-y-3">
                  <select className={field} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {activeCodes.map((code) => (
                    <div key={code}>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">{labels[code] || code}</label>
                      <input
                        className={field}
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountsByOption[code] || ''}
                        onChange={(e) => setAmountsByOption({ ...amountsByOption, [code]: e.target.value })}
                      />
                    </div>
                  ))}
                  <input className={field} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50">Record payment</button>
                </form>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Treasurer or vice treasurer access required to record transactions.</p>
          )}

          {summary ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold">Recent activity — {selectedMember?.fullName || selectedMember?.email}</h3>
              <div className="space-y-2 text-sm">
                {summary.deposits.slice(0, 5).map((d) => (
                  <div key={String(d._id)} className="flex justify-between rounded bg-neutral-50 px-3 py-2">
                    <span>Deposit · {String(d.paymentMethod || 'Cash')}</span>
                    <span>{formatUsd(Number(d.amount || 0))} {d.receiptNumber ? `· ${String(d.receiptNumber)}` : ''}</span>
                  </div>
                ))}
                {summary.payments.slice(0, 5).map((p) => (
                  <div key={String(p._id)} className="flex justify-between rounded bg-neutral-50 px-3 py-2">
                    <span>Payment</span>
                    <span>{formatUsd(Number(p.amount || 0))} {p.receiptNumber ? `· ${String(p.receiptNumber)}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {busy ? <div className="mt-4 flex justify-center"><Loader2 className="size-6 animate-spin text-sky-600" /></div> : null}
    </div>
  );
}

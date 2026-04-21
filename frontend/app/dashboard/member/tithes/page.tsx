'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type TitheRow = {
  _id: string;
  monthKey: string;
  amount: number;
  currency: string;
  note?: string;
  paidAt?: string;
};

export default function MemberTithesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<TitheRow[]>([]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [monthKey, setMonthKey] = useState(new Date().toISOString().slice(0, 7));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const data = await apiFetch<TitheRow[]>('/api/member/tithes', { token });
    setRows(data);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'MEMBER')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'MEMBER' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/member/tithes/pay', {
        method: 'POST',
        token,
        body: JSON.stringify({ amount: Number(amount), currency, monthKey, note }),
      });
      setAmount('');
      setNote('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to pay tithe');
    } finally {
      setBusy(false);
    }
  }

  if (!user || !canAccessMemberPortal(user)) return null;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Tithes</h1>
      <p className="mt-1 text-sm text-neutral-600">Pay monthly tithe with any amount.</p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <form className="mt-6 grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 md:grid-cols-2" onSubmit={onPay}>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Amount</label>
          <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Month</label>
          <input type="month" required value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={busy} className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Pay tithe
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Month</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Paid on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.monthKey}</td>
                <td className="px-4 py-2">{r.currency} {r.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No tithe payments yet.</p> : null}
      </div>
    </div>
  );
}

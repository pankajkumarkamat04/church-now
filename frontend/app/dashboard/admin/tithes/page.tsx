'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type MemberRow = { id: string; fullName?: string; email: string };
type TitheRow = {
  _id: string;
  monthKey: string;
  amount: number;
  currency: string;
  user?: { fullName?: string; email?: string };
};

export default function AdminTithesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [rows, setRows] = useState<TitheRow[]>([]);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [monthKey, setMonthKey] = useState(new Date().toISOString().slice(0, 7));
  const [currency, setCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [m, t] = await Promise.all([
      apiFetch<MemberRow[]>('/api/admin/members', { token }),
      apiFetch<TitheRow[]>('/api/admin/tithes', { token }),
    ]);
    setMembers(m);
    setRows(t);
    setUserId((prev) => prev || m[0]?.id || '');
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);
  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/admin/tithes', {
        method: 'POST',
        token,
        body: JSON.stringify({ userId, amount: Number(amount), monthKey, currency }),
      });
      setAmount('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!token || !window.confirm('Delete this tithe payment?')) return;
    await apiFetch(`/api/admin/tithes/${id}`, { method: 'DELETE', token });
    await load();
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Tithes</h1>
      <p className="mt-1 text-sm text-neutral-600">Record monthly random amount tithe payments for members.</p>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <form className="mt-6 grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 md:grid-cols-2 lg:grid-cols-4" onSubmit={onCreate}>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          {members.map((m) => <option key={m.id} value={m.id}>{m.fullName || m.email}</option>)}
        </select>
        <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Amount" />
        <input type="month" required value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}Save
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Month</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.user?.fullName || r.user?.email || '—'}</td>
                <td className="px-4 py-2">{r.monthKey}</td>
                <td className="px-4 py-2">{r.currency} {r.amount.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => remove(r._id)} className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-1 size-3.5" />Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No tithe entries yet.</p> : null}
      </div>
    </div>
  );
}

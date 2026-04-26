'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';

const CATEGORIES = ['SALARIES', 'BUILDING', 'PROJECTS - GU', 'PROJECTS - WATER VIEW', 'RATES', 'COUNCILS', 'OTHERS'];
type ConferenceRow = { _id: string; name: string; conferenceId?: string };
const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminCreateExpensePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { churches } = useSuperadminChurches();
  const [conferences, setConferences] = useState<ConferenceRow[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || !user || user.role !== 'SUPERADMIN') return;
    apiFetch<ConferenceRow[]>('/api/superadmin/conferences', { token })
      .then((data) => setConferences(data))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conferences'));
  }, [token, user]);

  const churchesForConference = useMemo(
    () =>
      conferenceId
        ? churches.filter(
            (c) => c.conference && typeof c.conference !== 'string' && c.conference._id === conferenceId
          )
        : churches,
    [churches, conferenceId]
  );

  useEffect(() => {
    if (!conferenceId) return;
    if (!churchesForConference.some((c) => c._id === churchId)) {
      setChurchId(churchesForConference[0]?._id || '');
    }
  }, [conferenceId, churchesForConference, churchId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/superadmin/expenses', {
        method: 'POST',
        token,
        body: JSON.stringify({
          churchId: churchId || undefined,
          conferenceId: conferenceId || undefined,
          title: title.trim(),
          amount: Number(amount),
          currency,
          category,
          description,
          expenseDate: new Date(expenseDate).toISOString(),
        }),
      });
      router.replace('/dashboard/superadmin/finance/expenses');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to save expense');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-4xl">
      <Link href="/dashboard/superadmin/finance/expenses" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to expenses
      </Link>
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add expense</h1>
        <p className="mt-1 text-sm text-neutral-600">Superadmin entries are auto-approved. Conference and church are optional.</p>
        <form className="mt-6 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
            <select className={field} value={conferenceId} onChange={(e) => setConferenceId(e.target.value)}>
              <option value="">No conference</option>
              {conferences.map((conference) => (
                <option key={conference._id} value={conference._id}>
                  {conference.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
            <select className={field} value={churchId} onChange={(e) => setChurchId(e.target.value)}>
              <option value="">No church</option>
              {churchesForConference.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Amount</label>
            <input className={field} type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
            <input className={field} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Category</label>
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Date</label>
            <input className={field} type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
            <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {err ? <p className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save expense
            </button>
            <Link href="/dashboard/superadmin/finance/expenses" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

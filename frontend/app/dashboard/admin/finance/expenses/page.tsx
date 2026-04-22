'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

const CATEGORIES = ['UTILITIES', 'SUPPLIES', 'SALARY', 'BUILDING', 'OUTREACH', 'OTHER'];

type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  expenseDate?: string;
  createdBy?: { fullName?: string; email?: string };
};

const field = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminFinanceExpensesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<ExpenseRow[]>('/api/admin/expenses', { token });
    setRows(data);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [user, token, load]);

  function resetForm() {
    setEditing(null);
    setTitle('');
    setAmount('');
    setCurrency('USD');
    setCategory('OTHER');
    setDescription('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        amount: Number(amount),
        currency,
        category,
        description,
        expenseDate: new Date(expenseDate).toISOString(),
      };
      if (editing) {
        await apiFetch(`/api/admin/expenses/${editing._id}`, { method: 'PUT', token, body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/admin/expenses', { method: 'POST', token, body: JSON.stringify(body) });
      }
      resetForm();
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!token || !window.confirm('Delete this expense?')) return;
    await apiFetch(`/api/admin/expenses/${id}`, { method: 'DELETE', token });
    await load();
  }

  function startEdit(row: ExpenseRow) {
    setEditing(row);
    setTitle(row.title);
    setAmount(String(row.amount));
    setCurrency(row.currency || 'USD');
    setCategory(row.category || 'OTHER');
    setDescription(row.description || '');
    setExpenseDate(row.expenseDate ? new Date(row.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Expenses</h1>
        <p className="mt-1 text-sm text-neutral-600">Record spending for your church.</p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form className="mb-8 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
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
        <div className="md:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
          <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-3">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? 'Update expense' : 'Add expense'}
          </button>
          {editing ? (
            <button type="button" onClick={resetForm} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">
                  {r.currency} {r.amount.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => startEdit(r)} className="mr-2 inline-flex items-center text-sky-700 hover:underline">
                    <Pencil className="mr-1 size-3.5" /> Edit
                  </button>
                  <button type="button" onClick={() => remove(r._id)} className="inline-flex items-center text-red-700 hover:underline">
                    <Trash2 className="mr-1 size-3.5" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No expenses yet.</p> : null}
      </div>
    </div>
  );
}

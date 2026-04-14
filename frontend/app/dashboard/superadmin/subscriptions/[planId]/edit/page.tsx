'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type PlanResponse = {
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
  church?: { _id?: string };
};

export default function SuperadminEditSubscriptionPlanPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { churches, err: churchesErr } = useSuperadminChurches();
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [churchId, setChurchId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadData() {
      if (!token || !planId) return;
      setLoadErr(null);
      setFetching(true);
      try {
        const plan = await apiFetch<PlanResponse>(`/api/superadmin/subscriptions/plans/${planId}`, { token });
        setChurchId(plan.church?._id || '');
        setName(plan.name || '');
        setDescription(plan.description || '');
        setMonthlyPrice(String(plan.monthlyPrice ?? 0));
        setCurrency(plan.currency || 'USD');
        setIsActive(plan.isActive !== false);
      } catch (error) {
        setLoadErr(error instanceof Error ? error.message : 'Failed to load plan');
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [token, planId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!churchId) {
      setErr('Church is required');
      return;
    }
    if (!name.trim()) {
      setErr('Plan name is required');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/subscriptions/plans/${planId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          churchId,
          name: name.trim(),
          description,
          monthlyPrice: Number(monthlyPrice),
          currency: currency.trim().toUpperCase(),
          isActive,
        }),
      });
      router.push('/dashboard/superadmin/subscriptions');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to update plan');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (loadErr || churchesErr) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadErr || churchesErr}</p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/superadmin/subscriptions"
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          ← Back to subscriptions
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Subscriptions</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Edit subscription plan</h1>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
            <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={field} required>
              <option value="">Select church</option>
              {churches.map((church) => (
                <option key={church._id} value={church._id}>
                  {church.name}
                </option>
              ))}
            </select>
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Plan name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} required />
            </div>
            <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${field} min-h-[80px]`}
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Monthly price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              className={field}
              required
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={field} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 rounded border-neutral-300" />
            Active
          </label>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Update plan
          </button>
        </form>
      </div>
    </div>
  );
}

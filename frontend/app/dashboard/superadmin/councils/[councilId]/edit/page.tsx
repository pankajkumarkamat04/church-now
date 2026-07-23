'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type Council = {
  _id: string;
  name: string;
  abbreviation?: string;
  displayOrder?: number;
  isActive?: boolean;
};

export default function SuperadminCouncilEditPage() {
  const params = useParams();
  const councilId = params.councilId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [displayOrder, setDisplayOrder] = useState('100');
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(true);

  const load = useCallback(async () => {
    if (!token || !councilId) return;
    setLoadBusy(true);
    setErr(null);
    try {
      const row = await apiFetch<Council>(`/api/superadmin/councils/${councilId}`, { token });
      setName(row.name || '');
      setAbbreviation(row.abbreviation || '');
      setDisplayOrder(String(row.displayOrder ?? 100));
      setIsActive(row.isActive !== false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load council');
    } finally {
      setLoadBusy(false);
    }
  }, [token, councilId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      void load();
    }
  }, [user, token, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Council name is required');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/councils/${councilId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: trimmed,
          abbreviation: abbreviation.trim().toUpperCase(),
          displayOrder: Number(displayOrder) || 100,
          isActive,
        }),
      });
      router.push('/dashboard/superadmin/councils');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to update council');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="dashboard-page dashboard-page--narrow w-full min-w-0">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/councils" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to councils
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">Edit council</h1>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        {loadBusy ? (
          <p className="inline-flex items-center gap-2 text-sm text-neutral-600">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="council-name" className="mb-1 block text-xs font-medium text-neutral-600">
                Official name
              </label>
              <input id="council-name" value={name} onChange={(e) => setName(e.target.value)} required className={field} />
            </div>
            <div>
              <label htmlFor="council-abbr" className="mb-1 block text-xs font-medium text-neutral-600">
                Abbreviation
              </label>
              <input
                id="council-abbr"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="council-order" className="mb-1 block text-xs font-medium text-neutral-600">
                Display order
              </label>
              <input
                id="council-order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className={field}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-neutral-300"
              />
              Active (shown on signup / member forms)
            </label>
            {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </button>
              <Link
                href={`/dashboard/superadmin/councils/${councilId}/regions`}
                className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Manage regions
              </Link>
              <Link
                href={`/dashboard/superadmin/councils/${councilId}/members`}
                className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                View members
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

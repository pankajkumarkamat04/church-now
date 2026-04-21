'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '../../../../types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminCouncilEditPage() {
  function churchUpdatePath(row: ChurchRecord): string {
    return row.churchType === 'SUB'
      ? `/api/superadmin/sub-churches/${churchId}`
      : `/api/superadmin/main-churches/${churchId}`;
  }

  const params = useParams();
  const churchId = params.churchId as string;
  const councilId = params.councilId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [church, setChurch] = useState<ChurchRecord | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'SUPERADMIN' || !churchId) return;
      const row = await apiFetch<ChurchRecord>(`/api/superadmin/churches/${churchId}`, { token });
      setChurch(row);
      const c = (row.councils || []).find((x) => x._id === councilId);
      setName(c?.name || '');
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load council'));
  }, [token, user, churchId, councilId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !church || !name.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      const nextCouncils = (church.councils || []).map((c) =>
        c._id === councilId ? { ...c, name: name.trim() } : c
      );
      await apiFetch(churchUpdatePath(church), {
        method: 'PUT',
        token,
        body: JSON.stringify({ councils: nextCouncils }),
      });
      router.replace('/dashboard/superadmin/churches/councils');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update council');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/superadmin/churches/councils" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to councils
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Edit council</h1>
        <p className="mt-1 text-sm text-neutral-600">{church?.name || 'Church'}</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Council name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

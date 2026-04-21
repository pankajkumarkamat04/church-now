'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminCouncilEditPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ councilId: string }>();
  const councilId = String(params?.councilId || '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token || !councilId) return;
      const church = await apiFetch<{ councils?: Array<{ _id: string; name: string }> }>('/api/admin/church', { token });
      const match = (church.councils || []).find((c) => c._id === councilId);
      if (!match) {
        setErr('Council not found');
        return;
      }
      setName(match.name || '');
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load council'));
  }, [token, councilId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !councilId) return;
    if (!name.trim()) {
      setErr('Council name is required');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const church = await apiFetch<{ councils?: Array<{ _id: string; name: string; roles?: unknown[] }> }>('/api/admin/church', { token });
      const next = (church.councils || []).map((c) => (c._id === councilId ? { ...c, name: name.trim() } : c));
      await apiFetch('/api/admin/church', {
        method: 'PUT',
        token,
        body: JSON.stringify({ councils: next }),
      });
      router.replace('/dashboard/admin/councils');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update council');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Edit council</h1>
        <form className="mt-4 space-y-3" onSubmit={onSave}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Council name" />
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
            {busy ? 'Saving…' : 'Update council'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type Council = { _id: string; name: string; abbreviation?: string };
type Region = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export default function CouncilRegionsPage() {
  const params = useParams();
  const councilId = params.councilId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [council, setCouncil] = useState<Council | null>(null);
  const [rows, setRows] = useState<Region[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    if (!token || !councilId) return;
    const [c, regions] = await Promise.all([
      apiFetch<Council>(`/api/superadmin/councils/${councilId}`, { token }),
      apiFetch<Region[]>(`/api/superadmin/councils/${councilId}/regions?includeInactive=1`, { token }),
    ]);
    setCouncil(c);
    setRows(regions);
  }, [token, councilId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load regions'));
    }
  }, [user, token, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/councils/${councilId}/regions`, {
        method: 'POST',
        token,
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });
      setName('');
      setCode('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create region');
    } finally {
      setBusy(false);
    }
  }

  async function removeRegion(row: Region) {
    if (!token || !window.confirm(`Delete region "${row.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/council-regions/${row._id}`, { method: 'DELETE', token });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to delete region');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="dashboard-page w-full min-w-0">
      <Link href="/dashboard/superadmin/councils" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to councils
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">
        Regions{council ? ` · ${council.name}` : ''}
        {council?.abbreviation ? ` (${council.abbreviation})` : ''}
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Council regions (e.g. CYF regions) are separate from church conferences. Members can belong to both.
      </p>

      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form onSubmit={onCreate} className="mt-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label htmlFor="region-name" className="mb-1 block text-xs font-medium text-neutral-600">
            Region name
          </label>
          <input id="region-name" value={name} onChange={(e) => setName(e.target.value)} required className={field} />
        </div>
        <div>
          <label htmlFor="region-code" className="mb-1 block text-xs font-medium text-neutral-600">
            Code (optional)
          </label>
          <input id="region-code" value={code} onChange={(e) => setCode(e.target.value)} className={field} />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add region
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-neutral-600">{row.code || '—'}</td>
                <td className="px-4 py-3">{row.isActive === false ? 'Inactive' : 'Active'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void removeRegion(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No regions yet for this council.</p>
        ) : null}
      </div>
    </div>
  );
}

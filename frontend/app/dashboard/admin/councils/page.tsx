'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

type CouncilRow = { key: string; _id?: string; name: string };

export default function AdminCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CouncilRow[]>([]);
  const [churchName, setChurchName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const church = await apiFetch<{ name?: string; councils?: Array<{ _id: string; name: string }> }>(
        '/api/admin/church',
        { token }
      );
      setChurchName(church.name || 'My church');
      setRows(
        Array.isArray(church.councils)
          ? church.councils.map((c) => ({ key: c._id, _id: c._id, name: c.name || '' }))
          : []
      );
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load councils'));
  }, [token, user]);

  function addCouncil() {
    setRows((prev) => [...prev, { key: `new-${Date.now()}`, name: '' }]);
  }

  function removeCouncil(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateCouncil(key: string, name: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, name } : r)));
  }

  async function onSave() {
    if (!token) return;
    const cleaned = rows.map((r) => r.name.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setErr('Add at least one council');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/admin/church', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          councils: cleaned.map((name) => ({ name, roles: [] })),
        }),
      });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save councils');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Councils</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage councils for {churchName}. Members can be assigned to one or more councils during creation.
        </p>
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(e) => updateCouncil(row.key, e.target.value)}
                placeholder="Council name"
                className={field}
              />
              <button
                type="button"
                onClick={() => removeCouncil(row.key)}
                className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCouncil}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100"
          >
            <Plus className="size-4" />
            Add council
          </button>
        </div>
        {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save councils
          </button>
        </div>
      </div>
    </div>
  );
}

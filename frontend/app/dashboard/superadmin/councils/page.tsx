'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type CouncilRow = { _id: string; name: string };

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

export default function SuperadminCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CouncilRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const r = await apiFetch<CouncilRow[]>('/api/superadmin/councils', { token });
    setRows(r);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load councils'));
    }
  }, [user, token, load]);

  async function addCouncil() {
    if (!token) return;
    const name = createName.trim();
    if (!name) {
      setErr('Council name is required');
      return;
    }
    setCreateBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/councils', {
        method: 'POST',
        token,
        body: JSON.stringify({ name }),
      });
      setCreateName('');
      setCreateOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create council');
    } finally {
      setCreateBusy(false);
    }
  }

  async function renameCouncil(row: CouncilRow) {
    if (!token) return;
    const name = window.prompt('Council name', row.name);
    if (!name || !name.trim() || name.trim() === row.name) return;
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/councils/${row._id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ name: name.trim() }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update council');
    }
  }

  async function removeCouncil(row: CouncilRow) {
    if (!token || !window.confirm(`Delete council "${row.name}"?`)) return;
    setBusyId(row._id);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/councils/${row._id}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete council');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Councils</h1>
          <p className="mt-1 text-sm text-neutral-600">Global councils shared across all churches and conferences.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Plus className="size-4" />
          Add council
        </button>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Council</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/superadmin/councils/${row._id}/members`} className={btn}>
                      <Users className="mr-1 size-3.5" />
                      Members
                    </Link>
                    <button type="button" onClick={() => void renameCouncil(row)} className={btn}>
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeCouncil(row)}
                      disabled={busyId === row._id}
                      className={`${btn} border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60`}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No councils yet.</p> : null}
      </div>
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">Create council</h2>
            <p className="mt-1 text-sm text-neutral-600">Add a global council name.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void addCouncil();
              }}
            >
              <input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                placeholder="Council name"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (createBusy) return;
                    setCreateOpen(false);
                    setCreateName('');
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBusy}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                >
                  {createBusy ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

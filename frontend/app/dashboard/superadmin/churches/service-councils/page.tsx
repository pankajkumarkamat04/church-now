'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord, ServiceCouncil } from '../types';

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

export default function SuperadminServiceCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [mainChurch, setMainChurch] = useState<ChurchRecord | null>(null);
  const [rows, setRows] = useState<ServiceCouncil[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mainChurchId = useMemo(() => mainChurch?._id || '', [mainChurch]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const mains = await apiFetch<ChurchRecord[]>('/api/superadmin/main-churches', { token });
    const firstMain = mains[0] || null;
    setMainChurch(firstMain);
    if (!firstMain?._id) {
      setRows([]);
      return;
    }
    const serviceCouncils = await apiFetch<ServiceCouncil[]>(
      `/api/superadmin/main-churches/${firstMain._id}/service-councils`,
      { token }
    );
    setRows(serviceCouncils);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load service councils'));
    }
  }, [user, token, load]);

  async function addServiceCouncil() {
    if (!token || !mainChurchId) return;
    const name = createName.trim();
    if (!name) {
      setErr('Service council name is required');
      return;
    }
    setCreateBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/main-churches/${mainChurchId}/service-councils`, {
        method: 'POST',
        token,
        body: JSON.stringify({ name, description: createDescription.trim() }),
      });
      setCreateName('');
      setCreateDescription('');
      setCreateOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create service council');
    } finally {
      setCreateBusy(false);
    }
  }

  async function renameServiceCouncil(row: ServiceCouncil) {
    if (!token || !mainChurchId) return;
    const name = window.prompt('Service council name', row.name);
    if (!name || !name.trim() || name.trim() === row.name) return;
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/main-churches/${mainChurchId}/service-councils/${row._id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ name: name.trim() }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update service council');
    }
  }

  async function removeServiceCouncil(row: ServiceCouncil) {
    if (!token || !mainChurchId || !window.confirm(`Delete service council "${row.name}"?`)) return;
    setBusyId(row._id);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/main-churches/${mainChurchId}/service-councils/${row._id}`, {
        method: 'DELETE',
        token,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete service council');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Service Councils</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Separate councils for ministry services, managed only by superadmin for the main church.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Main church: {mainChurch?.name || 'Not created yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!mainChurchId) return;
            setErr(null);
            setCreateOpen(true);
          }}
          disabled={!mainChurchId}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          <Plus className="size-4" />
          Add service council
        </button>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!mainChurchId ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Create the main church first to manage service councils.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Service council</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => void renameServiceCouncil(row)} className={btn}>
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeServiceCouncil(row)}
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
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">No service councils yet.</p>
          ) : null}
        </div>
      )}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">Create service council</h2>
            <p className="mt-1 text-sm text-neutral-600">This is separate from existing global councils.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void addServiceCouncil();
              }}
            >
              <input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                placeholder="Service council name"
              />
              <input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                placeholder="Description (optional)"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (createBusy) return;
                    setCreateOpen(false);
                    setCreateName('');
                    setCreateDescription('');
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

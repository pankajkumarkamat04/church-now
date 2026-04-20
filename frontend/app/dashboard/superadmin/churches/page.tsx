'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ChurchLeadershipModal, leadershipSummary } from '@/components/church/ChurchLeadershipModal';
import type { ChurchRecord } from './types';

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

export default function SuperadminChurchesListPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leadershipChurch, setLeadershipChurch] = useState<ChurchRecord | null>(null);

  function conferenceLabel(row: ChurchRecord) {
    if (!row.conference || typeof row.conference === 'string') return '—';
    return row.conference.name || row.conference.conferenceId || '—';
  }

  function mainChurchLabel(row: ChurchRecord) {
    if (!row.mainChurch || typeof row.mainChurch === 'string') return '—';
    return row.mainChurch.name || '—';
  }

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [mainChurches, subChurches] = await Promise.all([
      apiFetch<ChurchRecord[]>('/api/superadmin/main-churches', { token }),
      apiFetch<ChurchRecord[]>('/api/superadmin/sub-churches', { token }),
    ]);
    const merged = [...mainChurches, ...subChurches].sort((a, b) => a.name.localeCompare(b.name));
    setChurches(merged);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function removeChurch(id: string) {
    const target = churches.find((church) => church._id === id);
    if (!target) return;
    if (
      !token ||
      !window.confirm(
        'Delete this church? It must have no admins or members. Site content, events, and gallery for this church will be removed.'
      )
    ) {
      return;
    }
    setBusyId(id);
    setErr(null);
    try {
      const path =
        target.churchType === 'SUB'
          ? `/api/superadmin/sub-churches/${id}`
          : `/api/superadmin/main-churches/${id}`;
      await apiFetch(path, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Church management
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Churches
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage main churches and sub churches linked to conferences.
          </p>
        </div>
        <Link
          href="/dashboard/superadmin/churches/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
        >
          <Plus className="size-4" aria-hidden />
          Add church
        </Link>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Conference</th>
                <th className="px-4 py-3 font-medium">Main Church</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {churches.map((c) => (
                <tr key={c._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.churchType === 'SUB' ? 'Sub' : 'Main'}</td>
                  <td className="px-4 py-3 text-neutral-600">{conferenceLabel(c)}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.churchType === 'SUB' ? mainChurchLabel(c) : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.isActive === false
                          ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                          : 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                      }
                    >
                      {c.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/dashboard/superadmin/churches/${c._id}/edit`} className={btn}>
                        <Pencil className="mr-1 size-3.5" aria-hidden />
                        Edit
                      </Link>
                      <Link href={`/dashboard/superadmin/churches/${c._id}/members`} className={btn}>
                        <Users className="mr-1 size-3.5" aria-hidden />
                        Members
                      </Link>
                      <button
                        type="button"
                        onClick={() => setLeadershipChurch(c)}
                        className={btn}
                        title={leadershipSummary(c)}
                      >
                        <Users className="mr-1 size-3.5" aria-hidden />
                        Leadership
                      </button>
                      <button
                        type="button"
                        disabled={busyId === c._id}
                        onClick={() => removeChurch(c._id)}
                        className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
                      >
                        <Trash2 className="mr-1 size-3.5" aria-hidden />
                        {busyId === c._id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {churches.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No churches yet.</p>
        ) : null}
      </div>

      <ChurchLeadershipModal
        open={Boolean(leadershipChurch)}
        onClose={() => setLeadershipChurch(null)}
        churchId={leadershipChurch?._id || ''}
        churchType={leadershipChurch?.churchType === 'SUB' ? 'SUB' : 'MAIN'}
        churchName={leadershipChurch?.name || ''}
        token={token}
        row={leadershipChurch}
        onSaved={() => {
          load().catch(() => {});
        }}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Layers, Pencil, Plus, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ChurchLeadershipModal, leadershipSummary } from '@/components/church/ChurchLeadershipModal';
import { ChurchPastorManageModal } from '@/components/church/ChurchPastorManageModal';
import { ChurchViewModal } from '@/components/church/ChurchViewModal';
import { localMinisterFromChurch, withRevMinisterPrefix } from '@/lib/churchLocalMinister';
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
  const [pastorChurch, setPastorChurch] = useState<ChurchRecord | null>(null);
  const [viewChurch, setViewChurch] = useState<ChurchRecord | null>(null);

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
        'Delete this church? It must have no admins or members. Site content and events for this church will be removed.'
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
    <div className="w-full min-w-0 max-w-6xl">
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/superadmin/churches/service-councils"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Layers className="size-4" aria-hidden />
            Service councils
          </Link>
          <Link
            href="/dashboard/superadmin/churches/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
          >
            <Plus className="size-4" aria-hidden />
            Add church
          </Link>
        </div>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Name</th>
                <th
                  className="min-w-[160px] px-4 py-3 font-medium"
                  title="Main pastor or minister from local church leadership (spiritual pastor, or minister role)"
                >
                  Local Minister
                </th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Conference</th>
                <th className="px-4 py-3 font-medium">Main Church</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {churches.map((c) => {
                const localMinister = withRevMinisterPrefix(localMinisterFromChurch(c));
                return (
                  <tr key={c._id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-neutral-900">{c.name}</td>
                    <td className="max-w-[220px] px-4 py-3 text-neutral-800" title={localMinister}>
                      <span className="line-clamp-2">{localMinister}</span>
                    </td>
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
                        <button
                          type="button"
                          onClick={() => setViewChurch(c)}
                          className={btn}
                          title="View details"
                          aria-label="View church details"
                        >
                          <Eye className="size-3.5" aria-hidden />
                        </button>
                        <Link
                          href={`/dashboard/superadmin/churches/${c._id}/edit`}
                          className={btn}
                          title="Edit church"
                          aria-label="Edit church"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Link>
                        <Link
                          href={`/dashboard/superadmin/churches/${c._id}/members`}
                          className={btn}
                          title="Church members"
                          aria-label="Church members"
                        >
                          <Users className="size-3.5" aria-hidden />
                        </Link>
                        <Link
                          href="/dashboard/superadmin/councils"
                          className={btn}
                          title="Global councils"
                          aria-label="Global councils"
                        >
                          <Layers className="size-3.5" aria-hidden />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPastorChurch(c)}
                          className={btn}
                          title="Manage pastor assignments"
                          aria-label="Manage pastor assignments"
                        >
                          <UserCog className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeadershipChurch(c)}
                          className={btn}
                          title={leadershipSummary(c)}
                          aria-label="Edit leadership"
                        >
                          <Shield className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === c._id}
                          onClick={() => removeChurch(c._id)}
                          className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
                          title="Delete church"
                          aria-label="Delete church"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          {busyId === c._id ? '…' : null}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {churches.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No churches yet.</p>
        ) : null}
      </div>

      <ChurchViewModal
        open={Boolean(viewChurch)}
        onClose={() => setViewChurch(null)}
        church={viewChurch}
        localMinister={viewChurch ? withRevMinisterPrefix(localMinisterFromChurch(viewChurch)) : '—'}
      />
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
      <ChurchPastorManageModal
        open={Boolean(pastorChurch)}
        onClose={() => setPastorChurch(null)}
        churchId={pastorChurch?._id || ''}
        churchName={pastorChurch?.name || ''}
        token={token}
      />
    </div>
  );
}

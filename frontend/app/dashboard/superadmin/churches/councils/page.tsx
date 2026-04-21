'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '../types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminCouncilsListPage() {
  function churchUpdatePath(church: ChurchRecord): string {
    return church.churchType === 'SUB'
      ? `/api/superadmin/sub-churches/${church._id}`
      : `/api/superadmin/main-churches/${church._id}`;
  }

  const { user, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [selectedConferenceId, setSelectedConferenceId] = useState('');
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const rows = await apiFetch<ChurchRecord[]>('/api/superadmin/churches', { token });
    const active = rows.filter((c) => c.isActive !== false);
    setChurches(active);
    const queryChurchId = searchParams.get('churchId') || '';
    if (queryChurchId && active.some((c) => c._id === queryChurchId)) {
      setSelectedChurchId(queryChurchId);
      const linked = active.find((c) => c._id === queryChurchId);
      const conf =
        linked?.conference && typeof linked.conference === 'object' ? linked.conference._id : '';
      setSelectedConferenceId(conf || '');
    }
  }, [token, searchParams]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN' || !token) return;
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load councils'));
  }, [user, token, load]);

  const conferenceOptions = useMemo(() => {
    const map = new Map<string, string>();
    churches.forEach((c) => {
      if (c.conference && typeof c.conference === 'object' && c.conference._id) {
        map.set(c.conference._id, c.conference.name || c.conference.conferenceId || 'Conference');
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [churches]);

  const churchesByConference = useMemo(
    () =>
      selectedConferenceId
        ? churches.filter((c) => {
            const conf = c.conference;
            if (!conf || typeof conf === 'string') return false;
            return conf._id === selectedConferenceId;
          })
        : [],
    [churches, selectedConferenceId]
  );

  useEffect(() => {
    if (!selectedConferenceId) {
      setSelectedChurchId('');
      return;
    }
    setSelectedChurchId((prev) =>
      prev && churchesByConference.some((c) => c._id === prev) ? prev : churchesByConference[0]?._id || ''
    );
  }, [selectedConferenceId, churchesByConference]);

  const filteredChurches = useMemo(
    () =>
      selectedConferenceId && selectedChurchId
        ? churchesByConference.filter((c) => c._id === selectedChurchId)
        : [],
    [churchesByConference, selectedConferenceId, selectedChurchId]
  );
  const councilsFilterMessage = !selectedConferenceId
    ? 'Conference is required. Select a conference first.'
    : !selectedChurchId
      ? 'Church is required. Select a church to continue.'
      : 'Filters applied. Showing councils for the selected church.';

  async function onDelete(churchId: string, councilId: string) {
    if (!token) return;
    const church = churches.find((c) => c._id === churchId);
    if (!church) return;
    if (!window.confirm('Delete this council?')) return;
    setBusyKey(`${churchId}:${councilId}`);
    setErr(null);
    try {
      const nextCouncils = (church.councils || []).filter((c) => c._id !== councilId);
      await apiFetch(churchUpdatePath(church), {
        method: 'PUT',
        token,
        body: JSON.stringify({ councils: nextCouncils }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete council');
    } finally {
      setBusyKey(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Church councils</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Councils</h1>
          <p className="mt-1 text-sm text-neutral-600">Manage councils for each church.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/superadmin/users/members/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-900 hover:bg-violet-100"
          >
            <Plus className="size-4" />
            Add member to church
          </Link>
          <Link
            href="/dashboard/superadmin/churches/councils/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
          >
            <Plus className="size-4" />
            Add council
          </Link>
        </div>
      </div>

      <div className="mb-4 grid max-w-3xl gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
          <select value={selectedConferenceId} onChange={(e) => setSelectedConferenceId(e.target.value)} className={field}>
            <option value="">Select conference</option>
            {conferenceOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
          <select
            value={selectedChurchId}
            onChange={(e) => setSelectedChurchId(e.target.value)}
            className={field}
            disabled={!selectedConferenceId}
          >
            <option value="">{selectedConferenceId ? 'Select church' : 'Select conference first'}</option>
            {churchesByConference.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
          </select>
        </div>
      </div>
      <div
        className={`mb-4 flex items-center justify-between rounded-lg border px-3 py-2 ${
          selectedConferenceId && selectedChurchId
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <p
          className={`text-xs ${
            selectedConferenceId && selectedChurchId ? 'text-emerald-900' : 'text-amber-900'
          }`}
        >
          {councilsFilterMessage}
        </p>
        <button
          type="button"
          onClick={() => {
            setSelectedConferenceId('');
            setSelectedChurchId('');
          }}
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
        >
          Clear filters
        </button>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Council</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {filteredChurches.flatMap((church) =>
              (church.councils || []).map((council) => (
                <tr key={`${church._id}:${council._id || council.name}`} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{church.name}</td>
                  <td className="px-4 py-3">{council.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/superadmin/churches/councils/${church._id}/${council._id || ''}/edit`}
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => council._id && onDelete(church._id, council._id)}
                        disabled={!council._id || busyKey === `${church._id}:${council._id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {selectedConferenceId && selectedChurchId && filteredChurches.every((church) => (church.councils || []).length === 0) ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No councils yet.</p>
        ) : !selectedConferenceId || !selectedChurchId ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            {!selectedConferenceId
              ? 'Select a conference to continue.'
              : 'Select a church to view councils.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

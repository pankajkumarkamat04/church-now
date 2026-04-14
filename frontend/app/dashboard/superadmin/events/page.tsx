'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { SuperadminEventRecord } from '@/lib/superadminContentTypes';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

type EventRow = SuperadminEventRecord & {
  churchId: string;
  churchName: string;
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SuperadminEventsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { churches, err: churchesErr } = useSuperadminChurches();
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [churchFilter, setChurchFilter] = useState('all');

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!token) return;
      setLoadErr(null);
      if (!opts?.quiet) setFetching(true);
      try {
        const rows = await Promise.all(
          churches.map(async (church) => {
            const list = await apiFetch<SuperadminEventRecord[]>(
              `/api/superadmin/churches/${church._id}/events`,
              { token }
            );
            return list.map((ev) => ({
              ...ev,
              churchId: church._id,
              churchName: church.name,
            }));
          })
        );
        const flattened = rows
          .flat()
          .sort(
            (a, b) =>
              new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime()
          );
        setEvents(flattened);
      } finally {
        if (!opts?.quiet) setFetching(false);
      }
    },
    [token, churches]
  );

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && churches.length > 0) {
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
    } else if (user?.role === 'SUPERADMIN' && token && churches.length === 0) {
      setEvents([]);
      setFetching(false);
    }
  }, [user, token, churches, load]);

  const filteredEvents = useMemo(() => {
    if (churchFilter === 'all') return events;
    return events.filter((ev) => ev.churchId === churchFilter);
  }, [events, churchFilter]);

  async function onDelete(id: string, churchId: string) {
    if (!token || !confirm('Delete this event?')) return;
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/churches/${churchId}/events/${id}`, {
        method: 'DELETE',
        token,
      });
      if (editingId === id) startCreate();
      await load({ quiet: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  if (loadErr || churchesErr) {
    return (
      <div className="max-w-lg">
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadErr || churchesErr}
        </p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Events</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            All events
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage all church events in one place and filter by church.
          </p>
        </div>
        <Link
          href="/dashboard/superadmin/events/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
        >
          <Plus className="size-4" aria-hidden />
          New event
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Events</h2>
            <div className="w-full sm:w-72">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Filter by church</label>
              <select
                value={churchFilter}
                onChange={(e) => setChurchFilter(e.target.value)}
                className={field}
              >
                <option value="all">All churches</option>
                {churches.map((church) => (
                  <option key={church._id} value={church._id}>
                    {church.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Church</th>
                  <th className="px-4 py-2 font-medium">Starts</th>
                  <th className="px-4 py-2 font-medium">Public</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-neutral-800">
                {filteredEvents.map((ev) => (
                  <tr key={ev._id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 font-medium">{ev.title}</td>
                    <td className="px-4 py-2">{ev.churchName}</td>
                    <td className="px-4 py-2 text-neutral-600">
                      {ev.startsAt ? new Date(ev.startsAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2">{ev.published !== false ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/dashboard/superadmin/events/${ev._id}/edit?churchId=${ev.churchId}`}
                          className={btn}
                        >
                          <Pencil className="mr-1 size-3.5" aria-hidden />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(ev._id, ev.churchId)}
                          className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
                        >
                          <Trash2 className="mr-1 size-3.5" aria-hidden />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEvents.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">No events found.</p>
          ) : null}
      </div>
    </div>
  );
}

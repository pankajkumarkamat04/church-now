'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20';

type Conference = { _id: string; conferenceId?: string; name: string; description?: string };

export default function MemberAvailableConferencesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [joined, setJoined] = useState<Conference[]>([]);
  const [available, setAvailable] = useState<Conference[]>([]);
  const [joinConferenceId, setJoinConferenceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [joinedRows, allRows] = await Promise.all([
      apiFetch<Conference[]>('/api/member/conferences', { token }),
      apiFetch<Conference[]>('/api/public/conferences'),
    ]);
    setJoined(joinedRows);
    const joinedSet = new Set(joinedRows.map((x) => x._id));
    const other = allRows.filter((x) => !joinedSet.has(x._id));
    setAvailable(other);
    setJoinConferenceId((prev) => prev || other[0]?._id || '');
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'MEMBER')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'MEMBER' || !token) return;
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conferences'));
  }, [user, token, load]);

  async function joinConference() {
    if (!token || !joinConferenceId) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/member/conferences/${joinConferenceId}/join`, {
        method: 'POST',
        token,
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to join conference');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'MEMBER') return null;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Other conferences
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Conferences you have not joined yet.</p>
        </div>
        <Link
          href="/dashboard/member/conferences"
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to my conferences
        </Link>
      </div>

      {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        {available.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Select conference</label>
              <select
                value={joinConferenceId}
                onChange={(e) => setJoinConferenceId(e.target.value)}
                className={field}
              >
                {available.map((conf) => (
                  <option key={conf._id} value={conf._id}>
                    {conf.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={joinConference}
              disabled={busy || !joinConferenceId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Join conference
            </button>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">You already joined all conferences.</p>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Not joined conferences</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {available.map((conf) => (
            <article key={conf._id} className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-base font-semibold text-neutral-900">{conf.name}</h3>
              <p className="mt-1 text-xs text-neutral-500">Conference ID: {conf.conferenceId || '—'}</p>
              {conf.description ? <p className="mt-2 text-sm text-neutral-700 line-clamp-3">{conf.description}</p> : null}
              <div className="mt-3">
                <Link
                  href={`/dashboard/member/conferences/${conf._id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  View details
                </Link>
              </div>
            </article>
          ))}
          {available.length === 0 ? <p className="text-sm text-neutral-500">No conferences left to join.</p> : null}
        </div>
      </section>
    </div>
  );
}

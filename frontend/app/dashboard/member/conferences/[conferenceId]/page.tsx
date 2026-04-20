'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Leader = { _id: string; fullName?: string; email?: string };
type Conference = {
  _id: string;
  conferenceId?: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  leadership?: {
    churchBishop?: Leader | null;
    moderator?: Leader | null;
    secretary?: Leader | null;
    treasurer?: Leader | null;
    president?: Leader | null;
    superintendents?: Leader[];
  };
};

export default function MemberConferenceDetailsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conferenceId = params.conferenceId as string;

  const [conference, setConference] = useState<Conference | null>(null);
  const [joinedConferenceIds, setJoinedConferenceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isJoined = useMemo(
    () => joinedConferenceIds.includes(conferenceId),
    [joinedConferenceIds, conferenceId]
  );

  const load = useCallback(async () => {
    if (!token || !conferenceId) return;
    const [joined, detail] = await Promise.all([
      apiFetch<Conference[]>('/api/member/conferences', { token }),
      apiFetch<Conference>(`/api/member/conferences/${conferenceId}`, { token }),
    ]);
    setJoinedConferenceIds(joined.map((x) => x._id));
    setConference(detail);
  }, [token, conferenceId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'MEMBER')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'MEMBER' || !token || !conferenceId) return;
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conference'));
  }, [user, token, conferenceId, load]);

  async function joinConference() {
    if (!token || !conferenceId || isJoined) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/member/conferences/${conferenceId}/join`, {
        method: 'POST',
        token,
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to join');
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
            Conference details
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Full details and leadership information.</p>
        </div>
        <Link
          href="/dashboard/member/conferences"
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </Link>
      </div>

      {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      {!conference ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-neutral-700" />
        </div>
      ) : (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">{conference.name}</h2>
          <p className="mt-1 text-xs text-neutral-500">Conference ID: {conference.conferenceId || '—'}</p>
          {conference.description ? <p className="mt-3 text-sm text-neutral-700">{conference.description}</p> : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-neutral-700">
            <p>Email: {conference.email || '—'}</p>
            <p>Phone: {conference.phone || '—'}</p>
            <p>Contact person: {conference.contactPerson || '—'}</p>
          </div>

          <h3 className="mt-5 text-sm font-semibold text-neutral-900">Leadership</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm text-neutral-700">
            <p>Church Bishop: {conference.leadership?.churchBishop?.fullName || '—'}</p>
            <p>Moderator: {conference.leadership?.moderator?.fullName || '—'}</p>
            <p>Secretary: {conference.leadership?.secretary?.fullName || '—'}</p>
            <p>Treasurer: {conference.leadership?.treasurer?.fullName || '—'}</p>
            <p>President: {conference.leadership?.president?.fullName || '—'}</p>
            <p>
              Superintendents:{' '}
              {conference.leadership?.superintendents?.length
                ? conference.leadership.superintendents
                    .map((s) => s.fullName || s.email || '')
                    .filter(Boolean)
                    .join(', ')
                : '—'}
            </p>
          </div>

          {!isJoined ? (
            <button
              type="button"
              onClick={joinConference}
              disabled={busy}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Join this conference
            </button>
          ) : null}
        </section>
      )}

      {conference && isJoined ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 shadow-sm">
          You are a member of this conference.
        </section>
      ) : null}
    </div>
  );
}

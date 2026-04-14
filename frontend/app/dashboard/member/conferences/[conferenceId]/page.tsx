'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20';

type Leader = { _id: string; fullName?: string; email?: string };
type Conference = {
  _id: string;
  conferenceId?: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
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
type ForumPost = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  author?: { fullName?: string; email?: string };
  isPinned?: boolean;
};

export default function MemberConferenceDetailsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conferenceId = params.conferenceId as string;

  const [conference, setConference] = useState<Conference | null>(null);
  const [joinedConferenceIds, setJoinedConferenceIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
    if (joined.some((x) => x._id === conferenceId)) {
      const forum = await apiFetch<ForumPost[]>(`/api/member/conferences/${conferenceId}/forum/posts`, { token });
      setPosts(forum);
    } else {
      setPosts([]);
    }
  }, [token, conferenceId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'MEMBER')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'MEMBER' || !token || !conferenceId) return;
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conference'));
  }, [user, token, conferenceId, load]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !conferenceId || !isJoined) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/member/conferences/${conferenceId}/forum/posts`, {
        method: 'POST',
        token,
        body: JSON.stringify({ title, content }),
      });
      setTitle('');
      setContent('');
      const forum = await apiFetch<ForumPost[]>(`/api/member/conferences/${conferenceId}/forum/posts`, { token });
      setPosts(forum);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to post');
    } finally {
      setBusy(false);
    }
  }

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
            <p>Website: {conference.website || '—'}</p>
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
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Community forum</h2>
          <form onSubmit={createPost} className="mt-4 grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={field}
              placeholder="Post title"
              required
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`${field} min-h-[110px]`}
              placeholder="Write your message"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Post to forum
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {posts.map((post) => (
              <article key={post._id} className="rounded-lg border border-neutral-200 p-3">
                <p className="font-medium text-neutral-900">
                  {post.isPinned ? '[Pinned] ' : ''}
                  {post.title}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{post.content}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  {post.author?.fullName || post.author?.email || 'Unknown'} ·{' '}
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
            {posts.length === 0 ? <p className="text-sm text-neutral-500">No forum posts yet.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

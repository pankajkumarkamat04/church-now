'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Conference = {
  _id: string;
  conferenceId?: string;
  name: string;
  description?: string;
};

export default function MemberConferencesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadConferences = useCallback(async () => {
    if (!token) return;
    const rows = await apiFetch<Conference[]>('/api/member/conferences', { token });
    setConferences(rows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'MEMBER')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'MEMBER' || !token) return;
    loadConferences().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load conferences'));
  }, [user, token, loadConferences]);

  if (!user || user.role !== 'MEMBER') return null;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Conferences</h1>
        <p className="mt-1 text-sm text-neutral-600">All conferences you already joined as a member.</p>
      </div>

      {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-end">
          <Link
            href="/dashboard/member/conferences/available"
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Show other not joined conferences
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {conferences.map((conf) => (
            <article key={conf._id} className="rounded-lg border border-neutral-200 p-4">
              <h2 className="text-base font-semibold text-neutral-900">{conf.name}</h2>
              <p className="mt-1 text-xs text-neutral-500">Conference ID: {conf.conferenceId || '—'}</p>
              {conf.description ? <p className="mt-2 text-sm text-neutral-700 line-clamp-3">{conf.description}</p> : null}
              <div className="mt-3">
                <Link
                  href={`/dashboard/member/conferences/${conf._id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  View all conference details
                </Link>
              </div>
            </article>
          ))}
          {conferences.length === 0 ? (
            <p className="text-sm text-neutral-500">You have not joined any conference yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

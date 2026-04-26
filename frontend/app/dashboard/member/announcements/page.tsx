'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type AnnouncementRow = {
  _id: string;
  title: string;
  message: string;
  scope: 'SYSTEM' | 'CHURCH';
  church?: { name?: string } | null;
  createdBy?: { fullName?: string; email?: string } | null;
  createdByRole?: string;
  createdAt: string;
};

export default function MemberAnnouncementsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<AnnouncementRow[]>('/api/member/announcements', { token });
    setRows(data);
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessMemberPortal(user)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && canAccessMemberPortal(user) && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load announcements'));
    }
  }, [user, token, load]);

  if (!user || !canAccessMemberPortal(user)) return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Updates</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Announcements</h1>
        <p className="mt-1 text-sm text-neutral-600">Important notices from church and system administrators.</p>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row._id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">{row.title}</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {row.scope === 'SYSTEM' ? 'System-wide' : `Church: ${row.church?.name || '—'}`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                <Megaphone className="size-3.5" />
                {row.scope}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{row.message}</p>
            <p className="mt-3 text-xs text-neutral-500">
              By {row.createdBy?.fullName || row.createdBy?.email || 'System'} ({row.createdByRole || '—'}) ·{' '}
              {new Date(row.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500 shadow-sm">
          No announcements available right now.
        </p>
      ) : null}
    </div>
  );
}

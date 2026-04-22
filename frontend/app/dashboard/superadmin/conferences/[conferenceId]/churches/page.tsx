'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '@/app/dashboard/superadmin/churches/types';

type Conference = { _id: string; name: string; conferenceId?: string };

export default function SuperadminConferenceChurchesPage() {
  const params = useParams();
  const conferenceId = params.conferenceId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [conference, setConference] = useState<Conference | null>(null);
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !conferenceId) return;
    setErr(null);
    const [conferenceRow, churchRows] = await Promise.all([
      apiFetch<Conference>(`/api/superadmin/conferences/${conferenceId}`, { token }),
      apiFetch<ChurchRecord[]>(`/api/superadmin/sub-churches?conferenceId=${encodeURIComponent(conferenceId)}`, {
        token,
      }),
    ]);
    setConference(conferenceRow);
    setChurches(churchRows);
  }, [token, conferenceId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && conferenceId) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load churches'));
    }
  }, [user, token, conferenceId, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/conferences" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to conferences
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Conference churches</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {conference ? `${conference.name}${conference.conferenceId ? ` (${conference.conferenceId})` : ''}` : 'Loading conference...'}
        </p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!conference ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-7 animate-spin text-violet-600" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Church</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {churches.map((church) => (
                  <tr key={church._id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{church.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{[church.city, church.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600">{church.isActive === false ? 'Inactive' : 'Active'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/superadmin/churches/${church._id}/members`}
                        className="inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Users className="mr-1 size-3.5" />
                        Members
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {churches.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No churches in this conference.</p> : null}
        </div>
      )}
    </div>
  );
}

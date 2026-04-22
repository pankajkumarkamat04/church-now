'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Row = {
  id: string;
  email: string;
  fullName?: string;
  memberId?: string;
  role?: string;
  church?: { _id: string; name: string } | string | null;
  isActive?: boolean;
};

type Res = { council: { _id: string; name: string }; members: Row[] };

export default function SuperadminCouncilMembersPage() {
  const params = useParams();
  const councilId = params.councilId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !councilId) return;
    const r = await apiFetch<Res>(`/api/superadmin/councils/${councilId}/members`, { token });
    setData(r);
  }, [token, councilId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && councilId) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, councilId, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <Link href="/dashboard/superadmin/councils" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to councils
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        {data?.council?.name || 'Council'} members
      </h1>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {(data?.members || []).map((m) => (
              <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-neutral-700">{m.memberId || '—'}</td>
                <td className="px-4 py-3">{m.fullName || '—'}</td>
                <td className="px-4 py-3">{m.email}</td>
                <td className="px-4 py-3">
                  {typeof m.church === 'object' && m.church && 'name' in m.church ? m.church.name : '—'}
                </td>
                <td className="px-4 py-3">{m.role === 'ADMIN' ? 'Church admin' : 'Member'}</td>
                <td className="px-4 py-3">{m.isActive === false ? 'Inactive' : 'Active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No members assigned to this council.</p>
        ) : null}
      </div>
    </div>
  );
}

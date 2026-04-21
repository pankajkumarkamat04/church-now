'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type CouncilRow = { _id: string; name: string; myRoleLabels: string[] };
type MyCouncilsRes = { churchName: string; councils: CouncilRow[] };

export default function MemberCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MyCouncilsRes | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const r = await apiFetch<MyCouncilsRes>('/api/member/councils', { token });
    setData(r);
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
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  if (!user || !canAccessMemberPortal(user)) {
    return null;
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">My councils</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Councils you belong to at {data?.churchName || 'your church'}. Admins manage council membership and roles.
      </p>
      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}
      {!data ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.councils.map((c) => (
            <li
              key={c._id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-neutral-900">{c.name}</p>
              {c.myRoleLabels.length > 0 ? (
                <p className="mt-1 text-sm text-neutral-600">
                  {c.myRoleLabels.join(', ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {data && data.councils.length === 0 ? (
        <p className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
          You are not listed on any council yet. When your church admin adds you to a council, it will show here.
        </p>
      ) : null}
    </div>
  );
}

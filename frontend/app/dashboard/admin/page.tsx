'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardIndexPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [church, setChurch] = useState<{ name?: string; city?: string; country?: string; councils?: Array<{ _id: string; name: string }> } | null>(null);
  const [members, setMembers] = useState<Array<AuthUser & { id: string }>>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const [churchRow, memberRows] = await Promise.all([
        apiFetch<{ name?: string; city?: string; country?: string; councils?: Array<{ _id: string; name: string }> }>('/api/admin/church', { token }),
        apiFetch<Array<AuthUser & { id: string }>>('/api/admin/members', { token }),
      ]);
      setChurch(churchRow);
      setMembers(memberRows);
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load dashboard'));
  }, [token, user]);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive !== false).length, [members]);
  const leadershipMembers = useMemo(
    () => members.filter((m) => String(m.memberRoleDisplay || '').trim() && (m.memberRoleDisplay || '').toUpperCase() !== 'MEMBER').length,
    [members]
  );

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {church?.name || 'My Church'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {church?.city || 'City'}, {church?.country || 'Country'}
        </p>
      </div>
      {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Total members</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{members.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Active members</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{activeMembers}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Leadership roles</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{leadershipMembers}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Councils</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{church?.councils?.length || 0}</p>
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-neutral-900">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin/members/create" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
            Add member
          </Link>
          <Link href="/dashboard/admin/members" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            View members
          </Link>
          <Link href="/dashboard/admin/councils" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Manage councils
          </Link>
          <Link href="/dashboard/admin/pastors" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Record keeping
          </Link>
          <Link href="/dashboard/admin/finance" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Finance
          </Link>
        </div>
      </div>
    </div>
  );
}

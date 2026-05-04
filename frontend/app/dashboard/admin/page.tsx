'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ChurchDetails = {
  _id?: string;
  name?: string;
  churchType?: string;
  conference?: string | { _id?: string; name?: string };
  mainChurch?: string | { _id?: string; name?: string };
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  councils?: Array<string | { _id?: string; name?: string }>;
  localLeadership?: {
    chairperson?: string;
    secretary?: string;
    treasurer?: string;
  };
};

const labelFor = (value: unknown) => {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return String((value as { name?: string }).name || '—');
  }
  return '—';
};

export default function AdminDashboardIndexPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [church, setChurch] = useState<ChurchDetails | null>(null);
  const [members, setMembers] = useState<Array<AuthUser & { id: string }>>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const [churchRow, memberRows] = await Promise.all([
        apiFetch<ChurchDetails>('/api/admin/church', { token }),
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
  const councilsCount = useMemo(() => Array.isArray(church?.councils) ? church.councils.length : 0, [church?.councils]);
  const activeRatio = useMemo(() => {
    if (members.length === 0) return 0;
    return Math.round((activeMembers / members.length) * 100);
  }, [activeMembers, members.length]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Admin Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {church?.name || 'My Church'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {church?.city || 'City'}, {church?.country || 'Country'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Church Type</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{church?.churchType || '—'}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Conference</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{labelFor(church?.conference)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Main Church</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{labelFor(church?.mainChurch)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Status</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                church?.isActive === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {church?.isActive === false ? 'Inactive' : 'Active'}
            </span>
          </div>
        </div>
      </section>

      {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Total Members</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{members.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Active Members</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{activeMembers}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Leadership Roles</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{leadershipMembers}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Councils</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{councilsCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Active Ratio</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{activeRatio}%</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-neutral-900">Church Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Address</p>
              <p className="mt-1 text-sm text-neutral-900">{church?.address || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">State / Province</p>
              <p className="mt-1 text-sm text-neutral-900">{church?.stateOrProvince || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Postal Code</p>
              <p className="mt-1 text-sm text-neutral-900">{church?.postalCode || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Phone</p>
              <p className="mt-1 text-sm text-neutral-900">{church?.phone || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Email</p>
              <p className="mt-1 text-sm text-neutral-900">{church?.email || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Coordinates</p>
              <p className="mt-1 text-sm text-neutral-900">
                {church?.latitude ?? '—'}, {church?.longitude ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-neutral-900">Local Leadership</p>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Chairperson</p>
              <p className="mt-1 text-neutral-900">{church?.localLeadership?.chairperson || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Secretary</p>
              <p className="mt-1 text-neutral-900">{church?.localLeadership?.secretary || '—'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Treasurer</p>
              <p className="mt-1 text-neutral-900">{church?.localLeadership?.treasurer || '—'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-neutral-900">Quick Links</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/admin/members/create" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
            Add Member
          </Link>
          <Link href="/dashboard/admin/members" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Members
          </Link>
          <Link href="/dashboard/admin/councils" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Councils
          </Link>
          <Link href="/dashboard/admin/pastors" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Record Keeping
          </Link>
          <Link href="/dashboard/admin/finance" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Finance Overview
          </Link>
          <Link href="/dashboard/admin/payments" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Payments
          </Link>
          <Link href="/dashboard/admin/attendance" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Attendance
          </Link>
          <Link href="/dashboard/admin/events" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Events
          </Link>
          <Link href="/dashboard/admin/announcements" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Announcements
          </Link>
          <Link href="/dashboard/admin/media" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Media
          </Link>
          <Link href="/dashboard/admin/pastor-terms" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Leader Terms
          </Link>
          <Link href="/dashboard/admin/finance/reports" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Reports
          </Link>
        </div>
      </section>
    </div>
  );
}

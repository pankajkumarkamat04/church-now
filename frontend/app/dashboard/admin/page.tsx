'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, type AuthUser, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LeadershipUserRef =
  | string
  | {
      _id?: string;
      fullName?: string;
      firstName?: string;
      surname?: string;
      email?: string;
      memberId?: string;
    }
  | null
  | undefined;

type LocalLeadershipApi = {
  spiritualPastor?: LeadershipUserRef;
  churchPresident?: LeadershipUserRef;
  moderator?: LeadershipUserRef;
  deacon?: LeadershipUserRef;
  secretary?: LeadershipUserRef;
  treasurer?: LeadershipUserRef;
  viceSecretary?: LeadershipUserRef;
  viceTreasurer?: LeadershipUserRef;
};

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
  localLeadership?: LocalLeadershipApi;
};

/** Primary local leader: sub-church → deacon; main church → church president. */
function primaryLocalLeaderRef(
  leadership: LocalLeadershipApi | undefined,
  churchType?: string
): LeadershipUserRef {
  if (!leadership) return undefined;
  const isSub = churchType === 'SUB';
  if (isSub) {
    return leadership.deacon || leadership.moderator || leadership.churchPresident;
  }
  return leadership.churchPresident || leadership.moderator || leadership.spiritualPastor;
}

function primaryLocalLeaderLabel(churchType?: string): string {
  return churchType === 'SUB' ? 'Deacon' : 'Church president';
}

function formatLeadershipPerson(
  ref: LeadershipUserRef | undefined,
  members: Array<AuthUser & { id: string }>
): string {
  if (ref == null || ref === '') return '—';
  if (typeof ref === 'object') {
    let name =
      (ref.fullName && String(ref.fullName).trim()) ||
      [ref.firstName, ref.surname].filter(Boolean).join(' ').trim() ||
      (ref.email && String(ref.email).trim()) ||
      '';
    let mid = ref.memberId != null && String(ref.memberId).trim() !== '' ? String(ref.memberId).trim() : '';
    const oid = ref._id != null ? String(ref._id) : '';
    if ((!name || !mid) && oid) {
      const m = members.find((u) => u.id === oid);
      if (m) {
        if (!name) name = (m.fullName || m.email || '').trim();
        if (!mid && m.memberId != null && String(m.memberId).trim() !== '') mid = String(m.memberId).trim();
      }
    }
    if (name && mid) return `${name} (${mid})`;
    if (name) return name;
    if (mid) return `Member ${mid}`;
    return '—';
  }
  const id = String(ref).trim();
  if (!id) return '—';
  const m = members.find((u) => u.id === id);
  if (m) {
    const name = (m.fullName || m.email || '').trim();
    const mid = m.memberId != null && String(m.memberId).trim() !== '' ? String(m.memberId).trim() : '';
    if (name && mid) return `${name} (${mid})`;
    if (name) return name;
    if (mid) return `Member ${mid}`;
  }
  return id;
}

const labelFor = (value: unknown) => {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return String((value as { name?: string }).name || '—');
  }
  return '—';
};

/** Shared admin dashboard surfaces (dark mode contrast). */
const shellHero =
  'rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-white p-5 shadow-sm dark:border-neutral-700 dark:bg-gradient-to-r dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 dark:shadow-black/20';
const shellCard = 'rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900';
const shellField =
  'rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-600 dark:bg-neutral-800/90';
const txtLabel = 'text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const statLabel = 'text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const txtMuted = 'text-sm text-neutral-600 dark:text-neutral-400';
const txtTitle = 'text-sm font-semibold text-neutral-900 dark:text-neutral-100';
const txtValue = 'text-sm font-semibold text-neutral-900 dark:text-neutral-100';
const txtValueLead = 'mt-1 text-neutral-900 dark:text-neutral-100';
const linkSecondary =
  'rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700';

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
        apiFetch<AuthUser[] | Paginated<AuthUser>>('/api/admin/members?limit=500', { token }),
      ]);
      setChurch(churchRow);
      setMembers(unwrapPaginatedArray(memberRows));
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

  const primaryLeaderDisplay = useMemo(
    () =>
      formatLeadershipPerson(
        primaryLocalLeaderRef(church?.localLeadership, church?.churchType),
        members
      ),
    [church?.localLeadership, church?.churchType, members]
  );
  const secretaryDisplay = useMemo(
    () => formatLeadershipPerson(church?.localLeadership?.secretary, members),
    [church?.localLeadership?.secretary, members]
  );
  const treasurerDisplay = useMemo(
    () => formatLeadershipPerson(church?.localLeadership?.treasurer, members),
    [church?.localLeadership?.treasurer, members]
  );

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="dashboard-page w-full min-w-0 space-y-6">
      <section className={shellHero}>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Admin Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
          {church?.name || 'My Church'}
        </h1>
        <p className={`mt-1 ${txtMuted}`}>
          {church?.city || 'City'}, {church?.country || 'Country'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${shellCard} p-3`}>
            <p className={txtLabel}>Church Type</p>
            <p className={`mt-1 ${txtValue}`}>{church?.churchType || '—'}</p>
          </div>
          <div className={`${shellCard} p-3`}>
            <p className={txtLabel}>Conference</p>
            <p className={`mt-1 ${txtValue}`}>{labelFor(church?.conference)}</p>
          </div>
          <div className={`${shellCard} p-3`}>
            <p className={txtLabel}>Main Church</p>
            <p className={`mt-1 ${txtValue}`}>{labelFor(church?.mainChurch)}</p>
          </div>
          <div className={`${shellCard} p-3`}>
            <p className={txtLabel}>Status</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                church?.isActive === false
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-200'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
              }`}
            >
              {church?.isActive === false ? 'Inactive' : 'Active'}
            </span>
          </div>
        </div>
      </section>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          {err}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className={`${shellCard} p-4`}>
          <p className={statLabel}>Total Members</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{members.length}</p>
        </div>
        <div className={`${shellCard} p-4`}>
          <p className={statLabel}>Active Members</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{activeMembers}</p>
        </div>
        <div className={`${shellCard} p-4`}>
          <p className={statLabel}>Leadership Roles</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{leadershipMembers}</p>
        </div>
        <div className={`${shellCard} p-4`}>
          <p className={statLabel}>Councils</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{councilsCount}</p>
        </div>
        <div className={`${shellCard} p-4`}>
          <p className={statLabel}>Active Ratio</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{activeRatio}%</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className={`${shellCard} p-5 lg:col-span-2`}>
          <p className={`mb-4 ${txtTitle}`}>Church Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={shellField}>
              <p className={txtLabel}>Address</p>
              <p className={`mt-1 ${txtValue}`}>{church?.address || '—'}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>State / Province</p>
              <p className={`mt-1 ${txtValue}`}>{church?.stateOrProvince || '—'}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>Postal Code</p>
              <p className={`mt-1 ${txtValue}`}>{church?.postalCode || '—'}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>Phone</p>
              <p className={`mt-1 ${txtValue}`}>{church?.phone || '—'}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>Email</p>
              <p className={`mt-1 ${txtValue}`}>{church?.email || '—'}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>Coordinates</p>
              <p className={`mt-1 ${txtValue}`}>
                {church?.latitude ?? '—'}, {church?.longitude ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <div className={`${shellCard} p-5`}>
          <p className={`mb-4 ${txtTitle}`}>Local Leadership</p>
          <div className="space-y-2 text-sm">
            <div className={shellField}>
              <p className={txtLabel}>{primaryLocalLeaderLabel(church?.churchType)}</p>
              <p className={txtValueLead}>{primaryLeaderDisplay}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>Secretary</p>
              <p className={txtValueLead}>{secretaryDisplay}</p>
            </div>
            <div className={shellField}>
              <p className={txtLabel}>Treasurer</p>
              <p className={txtValueLead}>{treasurerDisplay}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${shellCard} p-5`}>
        <p className={`mb-3 ${txtTitle}`}>Quick Links</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/admin/members/create"
            className="rounded-lg bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Add Member
          </Link>
          <Link href="/dashboard/admin/members" className={`${linkSecondary} text-center`}>
            Members
          </Link>
          <Link href="/dashboard/admin/councils" className={`${linkSecondary} text-center`}>
            Councils
          </Link>
          <Link href="/dashboard/admin/finance" className={`${linkSecondary} text-center`}>
            Finance Overview
          </Link>
          <Link href="/dashboard/admin/payments" className={`${linkSecondary} text-center`}>
            Payments
          </Link>
          <Link href="/dashboard/admin/attendance" className={`${linkSecondary} text-center`}>
            Attendance
          </Link>
          <Link href="/dashboard/admin/events" className={`${linkSecondary} text-center`}>
            Events
          </Link>
          <Link href="/dashboard/admin/announcements" className={`${linkSecondary} text-center`}>
            Announcements
          </Link>
          <Link href="/dashboard/admin/media" className={`${linkSecondary} text-center`}>
            Media
          </Link>
          <Link href="/dashboard/admin/finance/reports" className={`${linkSecondary} text-center`}>
            Reports
          </Link>
        </div>
      </section>
    </div>
  );
}

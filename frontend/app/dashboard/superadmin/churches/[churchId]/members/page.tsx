'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Eye, KeyRound, Loader2, Pencil, Plus, Shield, Users } from 'lucide-react';
import { ChurchLeadershipEditor, leadershipSummary } from '@/components/church/ChurchLeadershipEditor';
import { ResetUserPasswordModal } from '@/components/users/ResetUserPasswordModal';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';
import type { ChurchRecord } from '../../types';

type MemberRow = AuthUser & { id: string };

type PageTab = 'members' | 'leadership';

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

function normalizeMemberRoleLabel(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return 'MEMBER';
  const lowered = raw.toLowerCase();
  if (lowered.includes('spiritual leader') || lowered.includes('spiritual pastor')) {
    return 'Spiritual leader/Pastor';
  }
  return raw;
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString();
}

function memberCongregationName(m: MemberRow): string {
  const ch = m.church;
  if (!ch) return '—';
  if (typeof ch === 'string') return '—';
  return ch.name || '—';
}

type SubChurchOption = { _id: string; name: string };

function SuperadminChurchMembersPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const churchId = params.churchId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const initialTab: PageTab = searchParams.get('tab') === 'leadership' ? 'leadership' : 'members';
  const [tab, setTab] = useState<PageTab>(initialTab);
  const [church, setChurch] = useState<ChurchRecord | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [localChurches, setLocalChurches] = useState<SubChurchOption[]>([]);
  const [localChurchFilter, setLocalChurchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MEMBER' | 'ADMIN'>('ALL');
  const [councilId, setCouncilId] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<'' | 'BADGED' | 'NON_BADGED'>('');
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string; name: string } | null>(null);

  const returnPath = `/dashboard/superadmin/churches/${churchId}/members`;

  const memberLinks = useCallback(
    (memberId: string) => ({
      view: `/dashboard/superadmin/users/${memberId}?from=${encodeURIComponent(returnPath)}`,
      edit: `/dashboard/superadmin/users/${memberId}/edit?from=${encodeURIComponent(returnPath)}`,
    }),
    [returnPath]
  );

  const isMainChurch = church?.churchType === 'MAIN';

  const hasFilters =
    roleFilter !== 'ALL' ||
    Boolean(councilId) ||
    Boolean(isActiveFilter) ||
    Boolean(badgeFilter) ||
    (isMainChurch && Boolean(localChurchFilter));

  const filterMessage = useMemo(() => {
    const parts: string[] = [];
    if (isMainChurch) {
      if (localChurchFilter) {
        const name = localChurches.find((c) => c._id === localChurchFilter)?.name || 'selected church';
        parts.push(name);
      } else {
        parts.push('all local churches');
      }
    }
    if (roleFilter !== 'ALL') parts.push(roleFilter === 'MEMBER' ? 'members only' : 'admins only');
    if (councilId) {
      const name = councils.find((c) => c._id === councilId)?.name || 'selected council';
      parts.push(name);
    }
    if (isActiveFilter === 'true') parts.push('active');
    else if (isActiveFilter === 'false') parts.push('inactive');
    if (badgeFilter === 'BADGED') parts.push('badged');
    else if (badgeFilter === 'NON_BADGED') parts.push('non-badged');
    if (parts.length === 0) {
      return isMainChurch
        ? 'Showing all members and admins from every local congregation.'
        : 'Showing all members and church admins for this congregation.';
    }
    return `Filters applied: ${parts.join(', ')}.`;
  }, [roleFilter, councilId, isActiveFilter, badgeFilter, councils, isMainChurch, localChurchFilter, localChurches]);

  const loadChurch = useCallback(async () => {
    if (!token || !churchId) return;
    const churchRow = await apiFetch<ChurchRecord>(`/api/superadmin/churches/${churchId}`, { token });
    setChurch(churchRow);
    return churchRow;
  }, [token, churchId]);

  const loadMembers = useCallback(async () => {
    if (!token || !churchId || !church) return;
    const query = new URLSearchParams({
      role: roleFilter,
      page: String(page),
      limit: String(pageSize),
    });
    if (church.churchType === 'MAIN') {
      query.set('memberScope', 'local');
      if (localChurchFilter) query.set('filterChurchId', localChurchFilter);
    } else {
      query.set('churchId', churchId);
    }
    if (councilId) query.set('councilId', councilId);
    if (isActiveFilter) query.set('isActive', isActiveFilter);
    if (badgeFilter) query.set('memberBadgeType', badgeFilter);

    const res = await apiFetch<{ data: MemberRow[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/superadmin/users?${query.toString()}`,
      { token }
    );
    setMembers(res.data);
    setMeta({ total: res.total, totalPages: res.totalPages, limit: res.limit });
  }, [token, churchId, church, roleFilter, localChurchFilter, councilId, isActiveFilter, badgeFilter, page, pageSize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN' || !token || !churchId) return;
    loadChurch().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load church'));
  }, [user, token, churchId, loadChurch]);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN' || !token || !churchId || tab !== 'members' || !church) return;
    loadMembers().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load members'));
  }, [user, token, churchId, church, tab, loadMembers]);

  useEffect(() => {
    async function loadCouncils() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      try {
        const rows = await apiFetch<Array<{ _id: string; name: string }>>('/api/superadmin/councils', { token });
        setCouncils(rows);
      } catch (e) {
        console.error('Failed to load councils', e);
      }
    }
    loadCouncils();
  }, [token, user]);

  useEffect(() => {
    async function loadLocalChurches() {
      if (!token || user?.role !== 'SUPERADMIN' || church?.churchType !== 'MAIN') return;
      try {
        const rows = await apiFetch<SubChurchOption[]>('/api/superadmin/sub-churches', { token });
        setLocalChurches(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('Failed to load local churches', e);
      }
    }
    loadLocalChurches();
  }, [token, user, church?.churchType]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, councilId, isActiveFilter, badgeFilter, localChurchFilter]);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'leadership' ? 'leadership' : 'members');
  }, [searchParams]);

  const churchType: 'MAIN' | 'SUB' = church?.churchType === 'SUB' ? 'SUB' : 'MAIN';

  function switchTab(next: PageTab) {
    setTab(next);
    setSavedMsg(null);
    const url = `/dashboard/superadmin/churches/${churchId}/members${next === 'leadership' ? '?tab=leadership' : ''}`;
    router.replace(url, { scroll: false });
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="dashboard-page w-full min-w-0">
      <div className="page-header-row mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/superadmin/churches"
            className="text-sm font-medium text-violet-700 hover:text-violet-900"
          >
            ← Back to churches
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {church?.name || 'Loading church…'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {tab === 'leadership'
              ? `Leadership: ${leadershipSummary(church)}`
              : isMainChurch
                ? 'Congregation roster and local church leadership for this main church.'
                : 'Members and admins registered at this congregation.'}
          </p>
        </div>
        {tab === 'members' ? (
          <Link
            href="/dashboard/superadmin/users/members/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
          >
            <Plus className="size-4" aria-hidden />
            Add member
          </Link>
        ) : null}
      </div>

      {church ? (
        <div className="mb-4 flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => switchTab('members')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
              tab === 'members'
                ? 'bg-white text-violet-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="size-4" aria-hidden />
            Members
          </button>
          <button
            type="button"
            onClick={() => switchTab('leadership')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
              tab === 'leadership'
                ? 'bg-white text-violet-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Shield className="size-4" aria-hidden />
            Leadership
          </button>
        </div>
      ) : null}

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      {!church ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-7 animate-spin text-violet-600" />
        </div>
      ) : tab === 'leadership' ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm text-neutral-600">
            {isMainChurch
              ? 'Choose officers from any active congregation member. Minister roles require pastors; moderator, secretary, treasurer, and committee use lay members. The main church spiritual leader is assigned only from Pastor Management → Main Church Pastor.'
              : 'Assign local church leaders from members registered at this congregation.'}
          </p>
          {savedMsg ? (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {savedMsg}
            </p>
          ) : null}
          <ChurchLeadershipEditor
            churchId={churchId}
            churchType={churchType}
            churchName={church.name}
            token={token}
            row={church}
            showHeader={false}
            onSaved={() => {
              setSavedMsg('Leadership saved successfully.');
              loadChurch().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to refresh'));
            }}
          />
        </div>
      ) : (
        <>
          {isMainChurch ? (
            <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              Members from every <strong>local congregation</strong> (sub-church) are listed below. Use the congregation
              filter to narrow to one church, or open the <strong>Leadership</strong> tab to assign main church roles.
            </p>
          ) : null}
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Filters</p>
            <div className={`grid gap-3 sm:grid-cols-2 ${isMainChurch ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              {isMainChurch ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Congregation</label>
                  <select
                    value={localChurchFilter}
                    onChange={(e) => setLocalChurchFilter(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                  >
                    <option value="">All local churches</option>
                    {localChurches.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Account</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'MEMBER' | 'ADMIN')}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                >
                  <option value="ALL">All accounts</option>
                  <option value="MEMBER">Members only</option>
                  <option value="ADMIN">Church admins only</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Council</label>
                <select
                  value={councilId}
                  onChange={(e) => setCouncilId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                >
                  <option value="">All councils</option>
                  {councils.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
                <select
                  value={isActiveFilter}
                  onChange={(e) => setIsActiveFilter(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                >
                  <option value="">All statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Badge</label>
                <select
                  value={badgeFilter}
                  onChange={(e) => setBadgeFilter(e.target.value as '' | 'BADGED' | 'NON_BADGED')}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                >
                  <option value="">All members</option>
                  <option value="BADGED">Badged</option>
                  <option value="NON_BADGED">Non-badged</option>
                </select>
              </div>
            </div>
            <div
              className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${
                hasFilters ? 'border-violet-200 bg-violet-50' : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <p className={`text-xs ${hasFilters ? 'text-violet-900' : 'text-neutral-700'}`}>{filterMessage}</p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('ALL');
                    setCouncilId('');
                    setIsActiveFilter('');
                    setBadgeFilter('');
                    setLocalChurchFilter('');
                  }}
                  className="text-xs font-medium text-violet-700 hover:text-violet-900"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="space-y-3 p-3 md:hidden">
              {members.map((m) => {
                const links = memberLinks(m.id);
                return (
                  <div key={m.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                    <p className="text-sm font-semibold text-neutral-900">{m.fullName || '—'}</p>
                    <p className="text-xs text-neutral-600">{m.email}</p>
                    <p className="mt-1 text-xs text-neutral-600">Member ID: {m.memberId || '—'}</p>
                    {isMainChurch ? (
                      <p className="mt-1 text-xs text-neutral-600">Congregation: {memberCongregationName(m)}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-neutral-600">
                      Councils: {(m.councils || []).length ? (m.councils || []).map((c) => c.name).join(', ') : '—'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Membership: {formatShortDate(m.membershipDate || m.membership_date || null)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={
                          m.memberBadgeType === 'BADGED'
                            ? 'rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900'
                            : 'rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800'
                        }
                      >
                        {m.memberBadgeType === 'BADGED' ? 'Badged' : 'Non-badged'}
                      </span>
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {m.role === 'ADMIN' ? 'Church admin' : 'Member'}
                      </span>
                      <span
                        className={
                          m.approvalStatus === 'PENDING'
                            ? 'rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900'
                            : m.isActive === false
                              ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                              : 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                        }
                      >
                        {m.approvalStatus === 'PENDING'
                          ? 'Pending approval'
                          : m.isActive === false
                            ? 'Inactive'
                            : 'Active'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={links.view} className={btn}>
                        <Eye className="mr-1 size-3.5" aria-hidden />
                        View
                      </Link>
                      <Link href={links.edit} className={btn}>
                        <Pencil className="mr-1 size-3.5" aria-hidden />
                        Edit
                      </Link>
                      {m.isActive !== false ? (
                        <button
                          type="button"
                          onClick={() =>
                            setResetTarget({
                              id: m.id,
                              email: m.email,
                              name: m.fullName || '',
                            })
                          }
                          className={btn}
                        >
                          <KeyRound className="mr-1 size-3.5" aria-hidden />
                          Reset password
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                    <th className="px-4 py-3 font-medium">Member ID</th>
                    {isMainChurch ? <th className="px-4 py-3 font-medium">Congregation</th> : null}
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Councils</th>
                    <th className="px-4 py-3 font-medium">Membership</th>
                    <th className="px-4 py-3 font-medium">Badge</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Member role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-800">
                  {members.map((m) => {
                    const links = memberLinks(m.id);
                    return (
                      <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-neutral-700">{m.memberId || '—'}</td>
                        <td className="px-4 py-3">{m.email}</td>
                        <td className="px-4 py-3">{m.fullName || '—'}</td>
                        <td
                          className="max-w-[10rem] px-4 py-3 text-xs"
                          title={(m.councils || []).map((c) => c.name).join(', ')}
                        >
                          {(m.councils || []).length ? (m.councils || []).map((c) => c.name).join(', ') : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-700">
                          {formatShortDate(m.membershipDate || m.membership_date || null)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              m.memberBadgeType === 'BADGED'
                                ? 'rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900'
                                : 'rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800'
                            }
                          >
                            {m.memberBadgeType === 'BADGED' ? 'Badged' : 'Non-badged'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {m.role === 'ADMIN' ? 'Church admin' : 'Member'}
                        </td>
                        <td className="px-4 py-3">
                          {normalizeMemberRoleLabel(
                            m.memberRoleDisplay || m.memberCategory || (m.role === 'ADMIN' ? '—' : 'MEMBER')
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              m.approvalStatus === 'PENDING'
                                ? 'rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900'
                                : m.isActive === false
                                  ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                                  : 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                            }
                          >
                            {m.approvalStatus === 'PENDING'
                              ? 'Pending approval'
                              : m.isActive === false
                                ? 'Inactive'
                                : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link href={links.view} className={btn}>
                              <Eye className="mr-1 size-3.5" aria-hidden />
                              View
                            </Link>
                            <Link href={links.edit} className={btn}>
                              <Pencil className="mr-1 size-3.5" aria-hidden />
                              Edit
                            </Link>
                            {m.isActive !== false ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setResetTarget({
                                    id: m.id,
                                    email: m.email,
                                    name: m.fullName || '',
                                  })
                                }
                                className={btn}
                              >
                                <KeyRound className="mr-1 size-3.5" aria-hidden />
                                Reset password
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {members.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">
                {isMainChurch && !hasFilters
                  ? 'No members are registered at any local congregation yet.'
                  : 'No members match these filters.'}
              </p>
            ) : null}
          </div>

          <Pagination
            page={page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            className="mt-2"
          />
        </>
      )}

      {token && resetTarget ? (
        <ResetUserPasswordModal
          open
          onClose={() => setResetTarget(null)}
          token={token}
          apiPath={`/api/superadmin/users/${resetTarget.id}/reset-password`}
          userEmail={resetTarget.email}
          userName={resetTarget.name}
          accent="violet"
        />
      ) : null}
    </div>
  );
}

export default function SuperadminChurchMembersPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-neutral-500">Loading…</div>}>
      <SuperadminChurchMembersPageInner />
    </Suspense>
  );
}

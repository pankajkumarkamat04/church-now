'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, Pencil, Plus, UserX } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type MemberRow = AuthUser & { id: string };

const inputBtn =
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

export default function AdminMembersListPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [churchName, setChurchName] = useState('My church');
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [councilId, setCouncilId] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<''
    | 'BADGED'
    | 'NON_BADGED'>('');
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const query = new URLSearchParams();
    if (councilId) query.set('councilId', councilId);
    if (isActiveFilter) query.set('isActive', isActiveFilter);
    if (badgeFilter) query.set('memberBadgeType', badgeFilter);
    const [m, c] = await Promise.all([
      apiFetch<MemberRow[]>(`/api/admin/members?${query.toString()}`, { token }),
      apiFetch<{ name?: string }>('/api/admin/church', { token }),
    ]);
    setMembers(m);
    setChurchName(c?.name || 'My church');
  }, [token, councilId, isActiveFilter, badgeFilter]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  useEffect(() => {
    async function loadReferences() {
      if (!token || user?.role !== 'ADMIN') return;
      try {
        const councilRows = await apiFetch<Array<{ _id: string; name: string }>>('/api/admin/councils', { token });
        setCouncils(councilRows);
      } catch (e) {
        console.error('Failed to load councils', e);
      }
    }
    loadReferences();
  }, [token, user]);

  async function deactivate(memberId: string) {
    if (!token || !window.confirm('Deactivate this member? They will not be able to sign in.')) {
      return;
    }
    setBusyId(memberId);
    setErr(null);
    try {
      await apiFetch(`/api/admin/members/${memberId}/deactivate`, {
        method: 'PATCH',
        token,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  }

  async function approve(memberId: string) {
    if (!token) return;
    setBusyId(memberId);
    setErr(null);
    try {
      await apiFetch(`/api/admin/members/${memberId}/approve`, {
        method: 'PATCH',
        token,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Members</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Congregation
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
          {churchName} members: ID, contact, councils, membership, and role.
        </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/members/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
          >
            <Plus className="size-4" aria-hidden />
            Add member
          </Link>
          <Link
            href="/dashboard/admin/councils"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Manage councils
          </Link>
        </div>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-700">Filters</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Council</label>
            <select
              value={councilId}
              onChange={(e) => setCouncilId(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
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
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
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
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
            >
              <option value="">All members</option>
              <option value="BADGED">Badged</option>
              <option value="NON_BADGED">Non-badged</option>
            </select>
          </div>
        </div>
        <div
          className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${
            councilId || isActiveFilter || badgeFilter ? 'border-sky-200 bg-sky-50' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <p className={`text-xs ${councilId || isActiveFilter || badgeFilter ? 'text-sky-900' : 'text-neutral-700'}`}>
            {councilId || isActiveFilter || badgeFilter ? 'Filters applied.' : 'No filters active.'}
          </p>
          {(councilId || isActiveFilter || badgeFilter) && (
            <button
              type="button"
              onClick={() => {
                setCouncilId('');
                setIsActiveFilter('');
                setBadgeFilter('');
              }}
              className="text-xs font-medium text-sky-700 hover:text-sky-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Member ID</th>

                <th className="px-4 py-3 font-medium">Councils</th>
                <th className="px-4 py-3 font-medium">Membership</th>
                <th className="px-4 py-3 font-medium">Badge</th>
                <th className="px-4 py-3 font-medium">Member Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {members.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3">{m.name || m.fullName || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-700">{m.memberId || '—'}</td>

                  <td className="max-w-[10rem] px-4 py-3 text-xs" title={(m.councils || []).map((c) => c.name).join(', ')}>
                    {(m.councils || []).length ? (m.councils || []).map((c) => c.name).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-700">
                    {formatShortDate(m.membershipDate || m.membership_date || null)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        m.memberBadgeType === 'BADGED'
                          ? 'rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900'
                          : 'rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700'
                      }
                    >
                      {m.memberBadgeType === 'BADGED' ? 'Badged' : 'Non-badged'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {normalizeMemberRoleLabel(m.memberRoleDisplay || m.memberCategory || 'MEMBER')}
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
                      <Link href={`/dashboard/admin/members/${m.id}`} className={inputBtn}>
                        <Eye className="mr-1 size-3.5" aria-hidden />
                        View
                      </Link>
                      {m.role === 'MEMBER' ? (
                        <Link
                          href={`/dashboard/admin/members/${m.id}/edit`}
                          className={inputBtn}
                        >
                          <Pencil className="mr-1 size-3.5" aria-hidden />
                          Edit
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-500">
                          Promoted admin
                        </span>
                      )}
                      {m.role === 'MEMBER' && m.isActive !== false ? (
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => deactivate(m.id)}
                          className={`${inputBtn} text-amber-800 border-amber-200 hover:bg-amber-50`}
                        >
                          <UserX className="mr-1 size-3.5" aria-hidden />
                          {busyId === m.id ? '…' : 'Deactivate'}
                        </button>
                      ) : null}
                      {m.role === 'MEMBER' && m.approvalStatus === 'PENDING' ? (
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => approve(m.id)}
                          className={`${inputBtn} border-emerald-200 text-emerald-800 hover:bg-emerald-50`}
                        >
                          <CheckCircle2 className="mr-1 size-3.5" aria-hidden />
                          {busyId === m.id ? '…' : 'Approve'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No members yet.</p>
        ) : null}
      </div>
    </div>
  );
}

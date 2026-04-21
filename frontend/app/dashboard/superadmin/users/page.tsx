'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Shield, Trash2, UserCog } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type UserRow = AuthUser & { id: string };

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

export default function SuperadminUsersListPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MEMBER' | 'ADMIN'>('ALL');
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [conferences, setConferences] = useState<Array<{ _id: string; name: string; conferenceId?: string }>>([]);
  const [churches, setChurches] = useState<Array<{ _id: string; name: string; conference?: string | { _id: string } | null }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const roleLabel =
    roleFilter === 'ALL' ? 'member and admin' : roleFilter === 'MEMBER' ? 'member' : 'admin';
  const usersFilterMessage = !conferenceId
    ? `Optional filters: showing ${roleLabel} accounts from all conferences and churches.`
    : churchId
      ? `Filters applied: ${roleLabel} + conference + church selected.`
      : `Filters applied: ${roleLabel} + conference selected. Optionally select a church to narrow results.`;

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const query = new URLSearchParams({ role: roleFilter });
    if (conferenceId) query.set('conferenceId', conferenceId);
    if (churchId) query.set('churchId', churchId);
    const u = await apiFetch<UserRow[]>(`/api/superadmin/users?${query.toString()}`, { token });
    setUsers(u);
  }, [token, roleFilter, conferenceId, churchId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  useEffect(() => {
    async function loadReferences() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      const [conferenceRows, churchRows] = await Promise.all([
        apiFetch<Array<{ _id: string; name: string; conferenceId?: string }>>('/api/superadmin/conferences', {
          token,
        }),
        apiFetch<Array<{ _id: string; name: string; conference?: string | { _id: string } | null }>>(
          '/api/superadmin/sub-churches',
          { token }
        ),
      ]);
      setConferences(conferenceRows);
      setChurches(churchRows);
    }
    loadReferences().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load filters'));
  }, [token, user]);

  async function removeUser(id: string) {
    if (!token || !window.confirm('Permanently delete this user? This cannot be undone.')) {
      return;
    }
    setBusyId(id);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/users/${id}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Member management
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Members
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create and manage people across conferences and churches. The list includes church admins and members.
          </p>
          <p className="mt-1 text-xs text-neutral-500">Use the role filter to show everyone, members only, or admins only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/superadmin/users/members/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-900 hover:bg-violet-100"
          >
            <UserCog className="size-4" aria-hidden />
            Add member
          </Link>
          <Link
            href="/dashboard/superadmin/churches/councils"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Manage councils
          </Link>
          <Link
            href="/dashboard/superadmin/admins"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Shield className="size-4" aria-hidden />
            Manage admins
          </Link>
        </div>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Filters</p>
        <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'MEMBER' | 'ADMIN')}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
          >
            <option value="ALL">All (members + church admins)</option>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
          <select
            value={conferenceId}
            onChange={(e) => {
              setConferenceId(e.target.value);
              setChurchId('');
            }}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
          >
            <option value="">All conferences</option>
            {conferences.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.conferenceId ? ` (${c.conferenceId})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
          <select
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 disabled:opacity-60"
            disabled={!conferenceId}
          >
            <option value="">{conferenceId ? 'All churches' : 'Select conference first'}</option>
            {churches
              .filter((church) => {
                if (!conferenceId) return false;
                const conf = church.conference;
                if (!conf) return false;
                return typeof conf === 'string' ? conf === conferenceId : conf._id === conferenceId;
              })
              .map((church) => (
                <option key={church._id} value={church._id}>
                  {church.name}
                </option>
              ))}
          </select>
        </div>
        </div>
        <div
          className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${
            conferenceId ? 'border-violet-200 bg-violet-50' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <p className={`text-xs ${conferenceId ? 'text-violet-900' : 'text-neutral-700'}`}>
            {usersFilterMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              setRoleFilter('ALL');
              setConferenceId('');
              setChurchId('');
            }}
            className="text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Member ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Church role</th>
                <th className="px-4 py-3 font-medium">Church</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-700">{u.memberId || '—'}</td>
                  <td className="px-4 py-3">{u.fullName || '—'}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {normalizeMemberRoleLabel(
                      u.memberRoleDisplay ||
                        u.memberCategory ||
                        (u.role === 'ADMIN' ? 'Church admin' : 'MEMBER'),
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {u.role === 'ADMIN' && Array.isArray(u.adminChurches) && u.adminChurches.length > 0
                      ? u.adminChurches.map((c) => c.name).join(', ')
                      : typeof u.church === 'object' && u.church && 'name' in u.church
                        ? u.church.name
                        : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.isActive === false
                          ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                          : 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                      }
                    >
                      {u.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/dashboard/superadmin/users/${u.id}/edit`} className={btn}>
                        <Pencil className="mr-1 size-3.5" aria-hidden />
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === u.id || u.id === user.id}
                        onClick={() => removeUser(u.id)}
                        className={`${btn} border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50`}
                        title={u.id === user.id ? 'Cannot delete yourself' : undefined}
                      >
                        <Trash2 className="mr-1 size-3.5" aria-hidden />
                        {busyId === u.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No users yet.</p>
        ) : null}
      </div>
    </div>
  );
}

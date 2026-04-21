'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, UserX } from 'lucide-react';
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

export default function AdminMembersListPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [churchName, setChurchName] = useState('My church');
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [m, c] = await Promise.all([
      apiFetch<MemberRow[]>('/api/admin/members', { token }),
      apiFetch<{ name?: string }>('/api/admin/church', { token }),
    ]);
    setMembers(m);
    setChurchName(c?.name || 'My church');
  }, [token]);

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

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Members</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Congregation
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{churchName} members with their assigned roles.</p>
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

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Member ID</th>
                <th className="px-4 py-3 font-medium">Member Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {members.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3">{m.fullName || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-700">{m.memberId || '—'}</td>
                  <td className="px-4 py-3">
                    {normalizeMemberRoleLabel(m.memberRoleDisplay || m.memberCategory || 'MEMBER')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        m.isActive === false
                          ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                          : 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                      }
                    >
                      {m.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/dashboard/admin/members/${m.id}/edit`}
                        className={inputBtn}
                      >
                        <Pencil className="mr-1 size-3.5" aria-hidden />
                        Edit
                      </Link>
                      {m.isActive !== false ? (
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

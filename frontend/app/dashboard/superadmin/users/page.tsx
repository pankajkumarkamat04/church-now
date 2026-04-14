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

export default function SuperadminUsersListPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const u = await apiFetch<UserRow[]>('/api/superadmin/users', { token });
    setUsers(u);
  }, [token]);

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
            User management
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Users
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Every account across all churches and roles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/superadmin/users/church-admins/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-900 hover:bg-violet-100"
          >
            <UserCog className="size-4" aria-hidden />
            Add church admin
          </Link>
          <Link
            href="/dashboard/superadmin/users/superadmins/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-500"
          >
            <Shield className="size-4" aria-hidden />
            Add superadmin
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Church</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.fullName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
                      {u.role}
                    </span>
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

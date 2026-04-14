'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type UserDetail = AuthUser & { id: string };

export default function SuperadminUserEditPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [row, setRow] = useState<UserDetail | null>(null);
  const [fullName, setFullName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoadErr(null);
    const u = await apiFetch<UserDetail>(`/api/superadmin/users/${userId}`, { token });
    setRow(u);
    setFullName(u.fullName || '');
    setIsActive(u.isActive !== false);
  }, [token, userId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && userId) {
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, userId, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/users/${userId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ fullName, isActive }),
      });
      router.replace('/dashboard/superadmin/users');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  if (loadErr) {
    return (
      <div className="max-w-lg">
        <Link href="/dashboard/superadmin/users" className="text-sm text-violet-700">
          ← Back
        </Link>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadErr}
        </p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/superadmin/users"
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to users
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Edit user</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {row.email}
          <span className="ml-2 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
            {row.role}
          </span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">You can update display name and whether the account can sign in.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="userActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-neutral-300"
            />
            <label htmlFor="userActive" className="text-sm text-neutral-800">
              Account active
            </label>
          </div>
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </button>
            <Link
              href="/dashboard/superadmin/users"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

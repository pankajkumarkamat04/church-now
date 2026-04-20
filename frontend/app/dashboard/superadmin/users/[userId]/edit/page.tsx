'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '@/app/dashboard/superadmin/churches/types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type UserDetail = AuthUser & { id: string };

export default function SuperadminUserEditPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [row, setRow] = useState<UserDetail | null>(null);
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [conferences, setConferences] = useState<Array<{ _id: string; name: string; conferenceId?: string }>>([]);
  const [churchIds, setChurchIds] = useState<string[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [memberCategory, setMemberCategory] = useState<'MEMBER' | 'PRESIDENT' | 'MODERATOR'>('MEMBER');
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
    if (u.role === 'ADMIN') {
      const ids =
        u.adminChurches && u.adminChurches.length > 0
          ? u.adminChurches.map((c) => c._id)
          : typeof u.church === 'object' && u.church && '_id' in u.church
            ? [u.church._id]
            : [];
      setChurchIds(ids);
      const allChurches = await apiFetch<ChurchRecord[]>('/api/superadmin/churches', { token });
      setChurches(allChurches);
    }
    if (u.role === 'MEMBER') {
      const confId =
        Array.isArray(u.conferences) && u.conferences.length > 0
          ? typeof u.conferences[0] === 'string'
            ? u.conferences[0]
            : u.conferences[0]._id
          : '';
      const cId =
        typeof u.church === 'object' && u.church && '_id' in u.church ? u.church._id : '';
      setConferenceId(confId || '');
      setChurchId(cId || '');
      setMemberCategory((u.memberCategory as 'MEMBER' | 'PRESIDENT' | 'MODERATOR') || 'MEMBER');
      const [allConferences, allSubChurches] = await Promise.all([
        apiFetch<Array<{ _id: string; name: string; conferenceId?: string }>>('/api/superadmin/conferences', {
          token,
        }),
        apiFetch<ChurchRecord[]>('/api/superadmin/sub-churches', { token }),
      ]);
      setConferences(allConferences);
      setChurches(allSubChurches);
    }
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
    if (!token || !row) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/users/${userId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          fullName,
          isActive,
          ...(row.role === 'ADMIN' && !row.memberId ? { churchIds } : {}),
          ...(row.role === 'MEMBER' ? { conferenceId, churchId, memberCategory } : {}),
        }),
      });
      router.replace(row.role === 'ADMIN' ? '/dashboard/superadmin/admins' : '/dashboard/superadmin/users');
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
    <div className="mx-auto max-w-4xl">
      <Link
        href={row.role === 'ADMIN' ? '/dashboard/superadmin/admins' : '/dashboard/superadmin/users'}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back
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
        {row.memberId ? (
          <p className="mt-2 text-sm text-neutral-700">
            Member ID: <span className="font-mono font-semibold text-neutral-900">{row.memberId}</span>
          </p>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
            </div>
          {row.role === 'ADMIN' && row.memberId ? (
            <div className="md:col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-700">
              <p className="font-medium text-neutral-900">Congregation admin</p>
              <p className="mt-1 text-xs text-neutral-600">
                This account was promoted from a member and may only administer{' '}
                {typeof row.church === 'object' && row.church && 'name' in row.church ? row.church.name : 'their church'}
                . Church assignment cannot be changed here.
              </p>
            </div>
          ) : null}
          {row.role === 'ADMIN' && !row.memberId ? (
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Churches</label>
              <select
                multiple
                value={churchIds}
                onChange={(e) =>
                  setChurchIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))
                }
                className={`${field} min-h-[120px]`}
              >
                {churches.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                Legacy admin (no member ID). Prefer adding new admins from congregation members.
              </p>
            </div>
          ) : null}
          {row.role === 'MEMBER' ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
                <select value={conferenceId} onChange={(e) => setConferenceId(e.target.value)} className={field}>
                  <option value="">Select conference</option>
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
                <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={field}>
                  <option value="">Select church</option>
                  {churches
                    .filter((c) => {
                      const conf = c.conference;
                      if (!conferenceId || !conf) return false;
                      return typeof conf === 'string' ? conf === conferenceId : conf._id === conferenceId;
                    })
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Member role option</label>
                <select
                  value={memberCategory}
                  onChange={(e) =>
                    setMemberCategory(e.target.value as 'MEMBER' | 'PRESIDENT' | 'MODERATOR')
                  }
                  className={field}
                >
                  <option value="MEMBER">Member</option>
                  <option value="PRESIDENT">President</option>
                  <option value="MODERATOR">Moderator</option>
                </select>
              </div>
            </>
          ) : null}
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
              href={row.role === 'ADMIN' ? '/dashboard/superadmin/admins' : '/dashboard/superadmin/users'}
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

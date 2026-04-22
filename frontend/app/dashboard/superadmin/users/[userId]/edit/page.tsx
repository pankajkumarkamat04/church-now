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
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [churchIds, setChurchIds] = useState<string[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [memberCategory, setMemberCategory] = useState<'MEMBER' | 'PRESIDENT' | 'MODERATOR' | 'PASTOR'>('MEMBER');
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
    const isPromotedChurchAdmin = u.role === 'ADMIN' && String(u.memberId || '').trim() !== '';
    if (u.role === 'ADMIN' && !isPromotedChurchAdmin) {
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
    if (u.role === 'MEMBER' || isPromotedChurchAdmin) {
      const confId =
        Array.isArray(u.conferences) && u.conferences.length > 0
          ? typeof u.conferences[0] === 'string'
            ? u.conferences[0]
            : (u.conferences[0] as { _id: string })._id
          : '';
      const cId =
        typeof u.church === 'object' && u.church && '_id' in u.church ? u.church._id : '';
      setConferenceId(confId || '');
      setChurchId(cId || '');
      setCouncilIds(Array.isArray(u.councilIds) ? u.councilIds : []);
      setMemberCategory((u.memberCategory as 'MEMBER' | 'PRESIDENT' | 'MODERATOR' | 'PASTOR') || 'MEMBER');
      const [allConferences, allSubChurches, allCouncils] = await Promise.all([
        apiFetch<Array<{ _id: string; name: string; conferenceId?: string }>>('/api/superadmin/conferences', {
          token,
        }),
        apiFetch<ChurchRecord[]>('/api/superadmin/sub-churches', { token }),
        apiFetch<Array<{ _id: string; name: string }>>('/api/superadmin/councils', { token }),
      ]);
      setConferences(allConferences);
      setChurches(allSubChurches);
      setCouncils(allCouncils);
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
      const isLegacyChurchAdmin = row.role === 'ADMIN' && !String(row.memberId || '').trim();
      const isMemberForm =
        row.role === 'MEMBER' || (row.role === 'ADMIN' && String(row.memberId || '').trim() !== '');
      const updated = await apiFetch<UserDetail>(`/api/superadmin/users/${userId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          fullName,
          isActive,
          ...(isLegacyChurchAdmin ? { churchIds } : {}),
          ...(isMemberForm ? { conferenceId, churchId, memberCategory, councilIds } : {}),
        }),
      });
      router.replace(
        updated.role === 'ADMIN' && !String(updated.memberId || '').trim()
          ? '/dashboard/superadmin/admins'
          : '/dashboard/superadmin/users',
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveAdmin() {
    if (!token || !row) return;
    if (row.role !== 'ADMIN' || !String(row.memberId || '').trim()) return;
    if (
      !window.confirm(
        'Remove church admin access? This person keeps their member record, congregation, and council assignments, but will no longer administer the church.',
      )
    ) {
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiFetch<UserDetail>(`/api/superadmin/users/${userId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ fullName, isActive, removeAdmin: true }),
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
      <div className="mx-auto w-full min-w-0 max-w-lg">
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

  const isLegacyChurchAdmin = row.role === 'ADMIN' && !String(row.memberId || '').trim();
  const isMemberForm =
    row.role === 'MEMBER' || (row.role === 'ADMIN' && String(row.memberId || '').trim() !== '');
  const isPromotedChurchAdmin = row.role === 'ADMIN' && String(row.memberId || '').trim() !== '';
  const backHref = isLegacyChurchAdmin ? '/dashboard/superadmin/admins' : '/dashboard/superadmin/users';

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <Link href={backHref} className="text-sm font-medium text-violet-700 hover:text-violet-900">
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
        <p className="mt-1 text-xs text-neutral-500">
          Update display name, sign-in access, and—where applicable—congregation and role details.
        </p>
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
          {isPromotedChurchAdmin ? (
            <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-neutral-800">
              <p className="font-medium text-neutral-900">Congregation admin (promoted from member)</p>
              <p className="mt-1 text-xs text-neutral-600">
                This account was promoted from a member. As an admin they manage{' '}
                {typeof row.church === 'object' && row.church && 'name' in row.church
                  ? row.church.name
                  : 'their home congregation'}
                . Their home conference, church, councils, and member role are editable below. Admin access is limited to
                that congregation; use “Remove admin access” to make them a member only.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onRemoveAdmin()}
                  disabled={busy}
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove admin access
                </button>
              </div>
            </div>
          ) : null}
          {isLegacyChurchAdmin ? (
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
          {isMemberForm ? (
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
                <label className="mb-1 block text-xs font-medium text-neutral-600">Councils</label>
                <select
                  multiple
                  value={councilIds}
                  onChange={(e) => setCouncilIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                  className={`${field} min-h-[120px]`}
                >
                  {councils.map((c) => (
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
                    setMemberCategory(e.target.value as 'MEMBER' | 'PRESIDENT' | 'MODERATOR' | 'PASTOR')
                  }
                  className={field}
                >
                  <option value="MEMBER">Member</option>
                  <option value="PRESIDENT">President</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="PASTOR">Pastor</option>
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
              href={backHref}
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

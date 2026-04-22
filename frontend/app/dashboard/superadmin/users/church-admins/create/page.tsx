'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '../../../churches/types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminCreateChurchAdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [members, setMembers] = useState<AuthUser[]>([]);
  const [memberUserId, setMemberUserId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadChurches = useCallback(async () => {
    if (!token) return;
    const [mainChurches, subChurches] = await Promise.all([
      apiFetch<ChurchRecord[]>('/api/superadmin/main-churches', { token }),
      apiFetch<ChurchRecord[]>('/api/superadmin/sub-churches', { token }),
    ]);
    const rows = [...mainChurches, ...subChurches];
    const deduped = Array.from(new Map(rows.map((c) => [c._id, c])).values());
    const active = deduped.filter((c) => c.isActive !== false).sort((a, b) => a.name.localeCompare(b.name));
    setChurches(active);
    setSelectedChurchId((prev) => (prev && active.some((c) => c._id === prev) ? prev : active[0]?._id || ''));
  }, [token]);

  const loadMembers = useCallback(async () => {
    if (!token || !selectedChurchId) {
      setMembers([]);
      setMemberUserId('');
      return;
    }
    const rows = await apiFetch<AuthUser[]>(
      `/api/superadmin/users?role=MEMBER&churchId=${encodeURIComponent(selectedChurchId)}`,
      { token }
    );
    setMembers(rows);
    setMemberUserId((prev) => (prev && rows.some((m) => m.id === prev) ? prev : rows[0]?.id || ''));
  }, [token, selectedChurchId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      loadChurches().catch(() => {});
    }
  }, [user, token, loadChurches]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && selectedChurchId) {
      loadMembers().catch(() => {});
    }
  }, [user, token, selectedChurchId, loadMembers]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedChurchId || !memberUserId) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/churches/${selectedChurchId}/admins`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          memberUserId,
          ...(password.trim() ? { password: password.trim() } : {}),
        }),
      });
      router.replace('/dashboard/superadmin/admins');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <Link href="/dashboard/superadmin/admins" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to admins
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add church admin</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Choose an active church, then select a <strong>member of that congregation</strong>. Their account becomes an
          admin for that church only. They keep their member ID. Optional: set a new login password.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
              <select
                required
                value={selectedChurchId}
                onChange={(e) => setSelectedChurchId(e.target.value)}
                className={field}
              >
                <option value="">Select church</option>
                {churches.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                    {c.churchType === 'MAIN' ? ' (main)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Member (must belong to this church)</label>
              <select
                required
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                className={field}
                disabled={!selectedChurchId || members.length === 0}
              >
                {!selectedChurchId ? (
                  <option value="">Select a church first</option>
                ) : members.length === 0 ? (
                  <option value="">No members at this church — add members first</option>
                ) : (
                  members.map((m) => {
                    const roleLabel = m.memberRoleDisplay || m.memberCategory || 'MEMBER';
                    const name =
                      m.fullName || `${m.firstName || ''} ${m.surname || ''}`.trim() || m.email;
                    return (
                      <option key={m.id} value={m.id}>
                        {(m.memberId || '—').toString()} — {name} — {roleLabel}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">New password (optional)</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={field}
              />
              <p className="mt-1 text-xs text-neutral-500">Leave blank to keep the member&apos;s current password.</p>
            </div>
          </div>
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy || !selectedChurchId || !memberUserId || members.length === 0}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Promote to admin
            </button>
            <Link
              href="/dashboard/superadmin/admins"
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

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AnnouncementRow = {
  _id: string;
  title: string;
  message: string;
  targetRoles?: string[];
  targetUsers?: Array<{ _id: string; fullName?: string; email?: string; memberId?: string }>;
  createdBy?: { fullName?: string; email?: string };
  createdAt: string;
};

const TARGET_ROLES = ['ADMIN', 'MEMBER', 'TREASURER', 'VICE_TREASURER', 'SECRETARY', 'VICE_SECRETARY', 'DEACON', 'VICE_DEACON'];
const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminAnnouncementsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [members, setMembers] = useState<Array<AuthUser & { id: string }>>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [announcements, memberRows] = await Promise.all([
      apiFetch<AnnouncementRow[]>('/api/admin/announcements', { token }),
      apiFetch<Array<AuthUser & { id: string }>>('/api/admin/members', { token }),
    ]);
    setRows(announcements);
    setMembers(memberRows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, [user, token, load]);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        id: m.id,
        label: `${m.memberId ? `${m.memberId} - ` : ''}${m.fullName || m.email || m.id}`,
      })),
    [members]
  );

  function toggleRole(role: string) {
    setTargetRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }
  function toggleUser(id: string) {
    setTargetUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/admin/announcements', {
        method: 'POST',
        token,
        body: JSON.stringify({ title, message, targetRoles, targetUserIds }),
      });
      setTitle('');
      setMessage('');
      setTargetRoles([]);
      setTargetUserIds([]);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create announcement');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Communication</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Announcements</h1>
        <p className="mt-1 text-sm text-neutral-600">Create announcements for your church by role or selected members.</p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form onSubmit={onSubmit} className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input className={field} required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Message</label>
            <textarea className={field} required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-600">Target roles (optional)</label>
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              {TARGET_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2">
                  <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => toggleRole(role)} />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-600">Selected members (optional)</label>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              {memberOptions.map((m) => (
                <label key={m.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={targetUserIds.includes(m.id)} onChange={() => toggleUser(m.id)} />
                  {m.label}
                </label>
              ))}
              {memberOptions.length === 0 ? <p className="text-neutral-500">No members</p> : null}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create announcement
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Audience</th>
              <th className="px-4 py-2 font-medium">Created by</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-neutral-100">
                <td className="px-4 py-2">
                  <p className="font-medium text-neutral-900">{r.title}</p>
                  <p className="line-clamp-2 text-xs text-neutral-600">{r.message}</p>
                </td>
                <td className="px-4 py-2 text-xs text-neutral-700">
                  Roles: {r.targetRoles?.length ? r.targetRoles.join(', ') : 'All'}<br />
                  Members: {r.targetUsers?.length || 0}
                </td>
                <td className="px-4 py-2 text-neutral-700">{r.createdBy?.fullName || r.createdBy?.email || '—'}</td>
                <td className="px-4 py-2 text-neutral-700">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No announcements yet.</p> : null}
      </div>
    </div>
  );
}

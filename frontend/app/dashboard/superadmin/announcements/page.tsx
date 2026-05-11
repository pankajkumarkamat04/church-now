'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ImageIcon, Loader2, Paperclip, X } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';
import { Pagination } from '@/components/ui/Pagination';

type AttachmentMeta = { url: string; name: string; mimeType: string; size: number };

type AnnouncementRow = {
  _id: string;
  title: string;
  message: string;
  scope: 'SYSTEM' | 'CHURCH';
  church?: { _id?: string; name?: string };
  attachments?: AttachmentMeta[];
  targetRoles?: string[];
  targetUsers?: Array<{ _id: string; fullName?: string; email?: string; memberId?: string }>;
  createdBy?: { fullName?: string; email?: string };
  createdAt: string;
};

const MAX_ATTACHMENTS = 10;

async function uploadAnnouncementFile(file: File, token: string) {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetch<{ url: string; size: number; mimeType: string }>('/api/superadmin/media/announcement-upload', {
    method: 'POST',
    token,
    body: fd,
  });
}

const TARGET_ROLES = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'TREASURER', 'VICE_TREASURER', 'SECRETARY', 'VICE_SECRETARY', 'DEACON', 'VICE_DEACON'];
const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminAnnouncementsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { churches } = useSuperadminChurches();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [scope, setScope] = useState<'SYSTEM' | 'CHURCH'>('SYSTEM');
  const [churchId, setChurchId] = useState('');
  const [members, setMembers] = useState<Array<AuthUser & { id: string }>>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<{ data: AnnouncementRow[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/superadmin/announcements?page=${page}&limit=20`, { token }
    );
    setRows(res.data);
    setMeta({ total: res.total, totalPages: res.totalPages, limit: res.limit });
  }, [token, page]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, [user, token, load]);

  useEffect(() => {
    if (!token || !churchId || scope !== 'CHURCH') {
      setMembers([]);
      setTargetUserIds([]);
      return;
    }
    apiFetch<{ data: Array<AuthUser & { id: string }> } | Array<AuthUser & { id: string }>>(
      `/api/superadmin/users?role=ALL&churchId=${encodeURIComponent(churchId)}&limit=500`,
      { token }
    )
      .then((data) => {
        const rows = Array.isArray(data) ? data : data.data ?? [];
        setMembers(rows);
      })
      .catch(() => setMembers([]));
  }, [token, churchId, scope]);

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

  async function onAttachmentPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !token) return;
    setUploadBusy(true);
    setErr(null);
    try {
      for (const file of Array.from(files)) {
        if (attachments.length >= MAX_ATTACHMENTS) break;
        const res = await uploadAnnouncementFile(file, token);
        setAttachments((prev) => [
          ...prev,
          {
            url: res.url,
            name: file.name,
            mimeType: res.mimeType || file.type || '',
            size: res.size,
          },
        ]);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploadBusy(false);
      e.target.value = '';
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/announcements', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title,
          message,
          scope,
          churchId: scope === 'CHURCH' ? churchId : undefined,
          targetRoles,
          targetUserIds: scope === 'CHURCH' ? targetUserIds : [],
          attachments: attachments.length ? attachments : undefined,
        }),
      });
      setTitle('');
      setMessage('');
      setTargetRoles([]);
      setTargetUserIds([]);
      setAttachments([]);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create announcement');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Communication</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Announcements</h1>
        <p className="mt-1 text-sm text-neutral-600">Create system-wide or church-targeted announcements by role and members.</p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form onSubmit={onSubmit} className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Scope</label>
            <select className={field} value={scope} onChange={(e) => setScope(e.target.value as 'SYSTEM' | 'CHURCH')}>
              <option value="SYSTEM">SYSTEM</option>
              <option value="CHURCH">CHURCH</option>
            </select>
          </div>
          {scope === 'CHURCH' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
              <select className={field} required value={churchId} onChange={(e) => setChurchId(e.target.value)}>
                <option value="">Select church</option>
                {churches.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input className={field} required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Message</label>
            <textarea className={field} required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Attachments (PDF or images)</label>
            <p className="mb-2 text-xs text-neutral-500">Stored in system media. Up to {MAX_ATTACHMENTS} files, 15 MB each.</p>
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              disabled={uploadBusy || attachments.length >= MAX_ATTACHMENTS}
              onChange={(e) => void onAttachmentPick(e)}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-900 hover:file:bg-violet-100"
            />
            {attachments.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {attachments.map((a) => (
                  <li
                    key={a.url}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-neutral-800">
                      {a.mimeType.startsWith('image/') ? <ImageIcon className="size-4 shrink-0 text-violet-600" /> : <FileText className="size-4 shrink-0 text-violet-600" />}
                      <span className="truncate">{a.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500">({Math.round(a.size / 1024)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.url !== a.url))}
                      className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
                      aria-label="Remove"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
          {scope === 'CHURCH' ? (
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
          ) : null}
        </div>
        <div className="mt-4">
          <button type="submit" disabled={busy || uploadBusy} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
            {busy || uploadBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create announcement
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Files</th>
              <th className="px-4 py-2 font-medium">Scope</th>
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
                  {r.attachments?.length ? (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="size-3.5 text-neutral-500" />
                      {r.attachments.length}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-700">{r.scope}{r.church?.name ? ` (${r.church.name})` : ''}</td>
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
      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} className="mt-2" />
    </div>
  );
}

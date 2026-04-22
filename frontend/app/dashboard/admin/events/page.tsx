'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type EventRow = {
  _id: string;
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string;
  excerpt?: string;
  description?: string;
  imageUrl?: string;
  published?: boolean;
  featuredOnHome?: boolean;
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminEventsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [featuredOnHome, setFeaturedOnHome] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const r = await apiFetch<EventRow[]>('/api/admin/events', { token });
    setRows(r);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load events'));
  }, [user, token, load]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setStartsAt('');
    setEndsAt('');
    setLocation('');
    setExcerpt('');
    setDescription('');
    setImageUrl('');
    setPublished(true);
    setFeaturedOnHome(false);
  }

  function startEdit(row: EventRow) {
    setEditingId(row._id);
    setTitle(row.title || '');
    setStartsAt(row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : '');
    setEndsAt(row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : '');
    setLocation(row.location || '');
    setExcerpt(row.excerpt || '');
    setDescription(row.description || '');
    setImageUrl(row.imageUrl || '');
    setPublished(row.published !== false);
    setFeaturedOnHome(Boolean(row.featuredOnHome));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const body = { title, startsAt: startsAt || null, endsAt: endsAt || null, location, excerpt, description, imageUrl, published, featuredOnHome };
      if (editingId) {
        await apiFetch(`/api/admin/events/${editingId}`, { method: 'PUT', token, body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/admin/events', { method: 'POST', token, body: JSON.stringify(body) });
      }
      resetForm();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save event');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token || !window.confirm('Delete this event?')) return;
    await apiFetch(`/api/admin/events/${id}`, { method: 'DELETE', token });
    await load();
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Events</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Church events</h1>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Starts</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3">{r.startsAt ? new Date(r.startsAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">{r.published !== false ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => startEdit(r)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"><Pencil className="size-3.5" />Edit</button>
                      <button type="button" onClick={() => void onDelete(r._id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700"><Trash2 className="size-3.5" />Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No events yet.</p> : null}
        </div>
        <form onSubmit={onSubmit} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-neutral-900">{editingId ? 'Edit event' : 'Add event'}</p>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <input className={field} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input className={field} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
          <input className={field} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" />
          <textarea className={`${field} min-h-[64px]`} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Excerpt" />
          <textarea className={`${field} min-h-[88px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Published</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featuredOnHome} onChange={(e) => setFeaturedOnHome(e.target.checked)} />Show on home</label>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? 'Update event' : 'Create event'}
          </button>
        </form>
      </div>
    </div>
  );
}

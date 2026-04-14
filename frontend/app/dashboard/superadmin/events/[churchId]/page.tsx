'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { SuperadminEventRecord } from '@/lib/superadminContentTypes';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

const textarea = `${field} min-h-[88px]`;

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function emptyForm() {
  return {
    title: '',
    slug: '',
    excerpt: '',
    description: '',
    startsAt: '',
    endsAt: '',
    location: '',
    imageUrl: '',
    published: true,
    featuredOnHome: false,
  };
}

export default function SuperadminEventsChurchPage() {
  const params = useParams();
  const churchId = params.churchId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<SuperadminEventRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!token || !churchId) return;
      setLoadErr(null);
      if (!opts?.quiet) setFetching(true);
      try {
        const list = await apiFetch<SuperadminEventRecord[]>(
          `/api/superadmin/churches/${churchId}/events`,
          { token }
        );
        setEvents(list);
      } finally {
        if (!opts?.quiet) setFetching(false);
      }
    },
    [token, churchId]
  );

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && churchId) {
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, churchId, load]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErr(null);
  }

  function startEdit(ev: SuperadminEventRecord) {
    setEditingId(ev._id);
    setForm({
      title: ev.title || '',
      slug: ev.slug || '',
      excerpt: ev.excerpt || '',
      description: ev.description || '',
      startsAt: toDatetimeLocalValue(ev.startsAt ?? undefined),
      endsAt: toDatetimeLocalValue(ev.endsAt ?? undefined),
      location: ev.location || '',
      imageUrl: ev.imageUrl || '',
      published: ev.published !== false,
      featuredOnHome: Boolean(ev.featuredOnHome),
    });
    setErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.title.trim()) {
      setErr('Title is required');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        excerpt: form.excerpt,
        description: form.description,
        startsAt: fromDatetimeLocalValue(form.startsAt),
        endsAt: fromDatetimeLocalValue(form.endsAt),
        location: form.location,
        imageUrl: form.imageUrl,
        published: form.published,
        featuredOnHome: form.featuredOnHome,
      };
      if (form.slug.trim()) body.slug = form.slug.trim().toLowerCase();

      if (editingId) {
        await apiFetch(`/api/superadmin/churches/${churchId}/events/${editingId}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/superadmin/churches/${churchId}/events`, {
          method: 'POST',
          token,
          body: JSON.stringify(body),
        });
      }
      startCreate();
      await load({ quiet: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token || !confirm('Delete this event?')) return;
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/churches/${churchId}/events/${id}`, {
        method: 'DELETE',
        token,
      });
      if (editingId === id) startCreate();
      await load({ quiet: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  if (loadErr) {
    return (
      <div className="max-w-lg">
        <Link href="/dashboard/superadmin/events" className="text-sm text-violet-700">
          ← Back
        </Link>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadErr}</p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Link
        href="/dashboard/superadmin/events"
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to events hub
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Events</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Starts</th>
                  <th className="px-4 py-2 font-medium">Public</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-neutral-800">
                {events.map((ev) => (
                  <tr key={ev._id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 font-medium">{ev.title}</td>
                    <td className="px-4 py-2 text-neutral-600">
                      {ev.startsAt ? new Date(ev.startsAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2">{ev.published !== false ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(ev)}
                        className="mr-1 inline-flex rounded p-1.5 text-violet-700 hover:bg-violet-50"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(ev._id)}
                        className="inline-flex rounded p-1.5 text-red-700 hover:bg-red-50"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">No events yet.</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-sm font-semibold text-neutral-900">
            {editingId ? 'Edit event' : 'New event'}
          </h2>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={field}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Slug (optional)</label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
                }
                className={field}
                placeholder="auto from title"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Excerpt</label>
              <input
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={textarea}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Starts</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Ends</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Image URL</label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                className={field}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  className="size-4 rounded border-neutral-300"
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={form.featuredOnHome}
                  onChange={(e) => setForm((f) => ({ ...f, featuredOnHome: e.target.checked }))}
                  className="size-4 rounded border-neutral-300"
                />
                Featured on home
              </label>
            </div>
            {err ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">{err}</p>
            ) : null}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={startCreate}
                  className="rounded-lg border border-neutral-300 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

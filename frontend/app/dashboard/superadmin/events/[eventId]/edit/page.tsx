'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { SuperadminEventRecord } from '@/lib/superadminContentTypes';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';
import { FileManagerField } from '@/components/dashboard/superadmin/FileManagerField';

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

export default function SuperadminEditEventPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();
  const { churches, err: churchesErr } = useSuperadminChurches();
  const eventId = params.eventId as string;
  const initialChurchId = search.get('churchId') || '';

  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [originChurchId] = useState(initialChurchId);
  const [churchId, setChurchId] = useState(initialChurchId);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [featuredOnHome, setFeaturedOnHome] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadData() {
      if (!token || !eventId || !originChurchId) return;
      setLoadErr(null);
      setFetching(true);
      try {
        const ev = await apiFetch<SuperadminEventRecord>(
          `/api/superadmin/churches/${originChurchId}/events/${eventId}`,
          { token }
        );
        setChurchId(originChurchId);
        setTitle(ev.title || '');
        setSlug(ev.slug || '');
        setExcerpt(ev.excerpt || '');
        setDescription(ev.description || '');
        setStartsAt(toDatetimeLocalValue(ev.startsAt ?? undefined));
        setEndsAt(toDatetimeLocalValue(ev.endsAt ?? undefined));
        setLocation(ev.location || '');
        setImageUrl(ev.imageUrl || '');
        setPublished(ev.published !== false);
        setFeaturedOnHome(Boolean(ev.featuredOnHome));
      } catch (error) {
        setLoadErr(error instanceof Error ? error.message : 'Failed to load event');
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [token, eventId, originChurchId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!churchId || !originChurchId) {
      setErr('Church is required');
      return;
    }
    if (!title.trim()) {
      setErr('Title is required');
      return;
    }

    setErr(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        excerpt,
        description,
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: fromDatetimeLocalValue(endsAt),
        location,
        imageUrl,
        published,
        featuredOnHome,
      };
      if (slug.trim()) body.slug = slug.trim().toLowerCase();

      if (churchId === originChurchId) {
        await apiFetch(`/api/superadmin/churches/${originChurchId}/events/${eventId}`, {
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
        await apiFetch(`/api/superadmin/churches/${originChurchId}/events/${eventId}`, {
          method: 'DELETE',
          token,
        });
      }
      router.push('/dashboard/superadmin/events');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to update event');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (!originChurchId) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Church id is missing. Please open edit from the events list.
        </p>
      </div>
    );
  }

  if (loadErr || churchesErr) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadErr || churchesErr}
        </p>
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/events" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to events
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Events</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Edit event</h1>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
            <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={field} required>
              <option value="">Select church</option>
              {churches.map((church) => (
                <option key={church._id} value={church._id}>
                  {church.name}
                </option>
              ))}
            </select>
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} required />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Slug (optional)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className={field}
              placeholder="auto from title"
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Excerpt</label>
            <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={textarea} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Starts</label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Ends</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2">
              <FileManagerField label="Image URL" value={imageUrl} onChange={setImageUrl} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-4 rounded border-neutral-300" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={featuredOnHome}
                onChange={(e) => setFeaturedOnHome(e.target.checked)}
                className="size-4 rounded border-neutral-300"
              />
              Featured on home
            </label>
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Update event
          </button>
        </form>
      </div>
    </div>
  );
}

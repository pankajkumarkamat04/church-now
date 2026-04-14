'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';
import { FileManagerField } from '@/components/dashboard/superadmin/FileManagerField';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';
const textarea = `${field} min-h-[72px]`;

export default function SuperadminCreateGalleryItemPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { churches, err: churchesErr } = useSuperadminChurches();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [churchId, setChurchId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [published, setPublished] = useState(true);
  const [showOnHome, setShowOnHome] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!churchId && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!churchId) {
      setErr('Church is required');
      return;
    }
    if (!imageUrl.trim()) {
      setErr('Image URL is required');
      return;
    }

    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/churches/${churchId}/gallery`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          title,
          imageUrl: imageUrl.trim(),
          caption,
          sortOrder: Number(sortOrder) || 0,
          published,
          showOnHome,
        }),
      });
      router.push('/dashboard/superadmin/gallery');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create item');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/gallery" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to gallery
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Gallery</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Create gallery item</h1>
      </div>

      {churchesErr ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{churchesErr}</p>
      ) : null}

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
            <div className="md:col-span-2">
              <FileManagerField label="Image URL" value={imageUrl} onChange={setImageUrl} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Caption</label>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className={textarea} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Sort order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={field} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-4 rounded border-neutral-300" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={showOnHome} onChange={(e) => setShowOnHome(e.target.checked)} className="size-4 rounded border-neutral-300" />
              Show on home
            </label>
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create item
          </button>
        </form>
      </div>
    </div>
  );
}

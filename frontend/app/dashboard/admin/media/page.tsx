'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch, getApiBase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type MediaItem = {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
};

export default function AdminMediaPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function load() {
    if (!token) return;
    setErr(null);
    setFetching(true);
    try {
      const data = await apiFetch<MediaItem[]>('/api/admin/media?limit=300', { token });
      setItems(data);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to load media');
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      void load();
    }
  }, [user, token]);

  async function onUpload(file: File) {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${getApiBase()}/api/admin/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Upload failed');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(name: string) {
    if (!token || !window.confirm('Delete this media file?')) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/media/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        token,
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Media</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Church media manager
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Upload and manage media only for your church.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500">
          <Upload className="size-4" />
          Upload image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
              e.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}
      {busy ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="size-4 animate-spin text-sky-600" />
          Working...
        </div>
      ) : null}

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-sky-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <article key={item.name} className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.name} className="aspect-square w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs text-neutral-600">{item.name}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(item.url)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100"
                  >
                    <ImagePlus className="size-3.5" />
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(item.name)}
                    className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                    aria-label="Delete media"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <p className="col-span-full py-12 text-center text-sm text-neutral-500">No media uploaded yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { FileText, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { apiFetch, getApiBase, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const fieldClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

const FLYER_ACCEPT =
  'image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type MediaItem = {
  name: string;
  url: string;
  size: number;
  mimeType?: string;
  uploadedAt: string;
};

type FileManagerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** superadmin = global media; admin = church-scoped media */
  scope?: 'superadmin' | 'admin';
};

function isImageMedia(item: MediaItem): boolean {
  if (item.mimeType?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(item.name);
}

export function FileManagerField({
  label,
  value,
  onChange,
  scope = 'superadmin',
}: FileManagerFieldProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const listPath = scope === 'admin' ? '/api/admin/media?limit=200' : '/api/superadmin/media?limit=200';
  const uploadPath =
    scope === 'admin' ? '/api/admin/media/flyer-upload' : '/api/superadmin/media/flyer-upload';
  const deletePathPrefix = scope === 'admin' ? '/api/admin/media/' : '/api/superadmin/media/';

  async function loadItems() {
    if (!token) return;
    setErr(null);
    setLoading(true);
    try {
      const raw = await apiFetch<MediaItem[] | Paginated<MediaItem>>(listPath, { token });
      setItems(unwrapPaginatedArray(raw));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to load media');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, scope, token]);

  async function onUpload(file: File) {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${getApiBase()}${uploadPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Upload failed');
      }
      onChange(body.url || '');
      await loadItems();
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
      await apiFetch(`${deletePathPrefix}${encodeURIComponent(name)}`, {
        method: 'DELETE',
        token,
      });
      if (value.includes(name)) onChange('');
      await loadItems();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} placeholder="https://… or upload below" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <ImagePlus className="size-3.5" />
          Media
        </button>
      </div>
      {value ? (
        <p className="mt-1 truncate text-xs text-neutral-500" title={value}>
          Attached: {value.split('/').pop() || value}
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-neutral-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">File manager</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500">
                <Upload className="size-3.5" />
                Upload image, PDF, or document
                <input
                  type="file"
                  accept={FLYER_ACCEPT}
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              {busy ? <Loader2 className="size-4 animate-spin text-violet-600" /> : null}
            </div>

            {err ? (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
            ) : null}

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-violet-600" />
              </div>
            ) : (
              <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto md:grid-cols-4">
                {items.map((item) => (
                  <div key={item.name} className="rounded-lg border border-neutral-200 p-2">
                    {isImageMedia(item) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.name} className="aspect-square w-full rounded object-cover" />
                    ) : (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded bg-neutral-50 p-2 text-center hover:bg-neutral-100"
                      >
                        <FileText className="size-8 text-neutral-500" aria-hidden />
                        <span className="line-clamp-2 text-[10px] font-medium text-neutral-700">{item.name}</span>
                      </a>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onChange(item.url);
                          setOpen(false);
                        }}
                        className="flex-1 rounded border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900 hover:bg-violet-100"
                      >
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.name)}
                        className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                        aria-label="Delete media"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 ? (
                  <p className="col-span-full py-8 text-center text-sm text-neutral-500">
                    No media yet. Upload an image, PDF flyer, or document.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminConferenceCreatePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/superadmin/conferences', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: name.trim(),
          description,
          email,
          phone,
          isActive,
        }),
      });
      router.push('/dashboard/superadmin/conferences');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create conference');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/conferences" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to conferences
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Conference</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Create conference</h1>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Conference ID</label>
              <input value="Auto generated on save" readOnly className={`${field} bg-neutral-50`} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} min-h-[90px]`} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 rounded border-neutral-300" />
              Active
            </label>
            <p className="text-xs text-neutral-600">
              Conference contact details only. Deacon, secretary, and other roles are set per church (church leadership),
              not on the conference.
            </p>
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create conference
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Conference = {
  _id: string;
  conferenceId?: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminConferenceEditPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conferenceId = params.conferenceId as string;
  const [conference, setConference] = useState<Conference | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadConference() {
    if (!token || !conferenceId) return;
    const row = await apiFetch<Conference>(`/api/superadmin/conferences/${conferenceId}`, { token });
    setConference(row);
    setName(row.name || '');
    setDescription(row.description || '');
    setEmail(row.email || '');
    setPhone(row.phone || '');
    setContactPerson(row.contactPerson || '');
    setIsActive(row.isActive !== false);
  }

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && conferenceId) {
      loadConference().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, conferenceId]);

  async function saveConference(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/conferences/${conferenceId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: name.trim(),
          description,
          email,
          phone,
          contactPerson,
          isActive,
        }),
      });
      await loadConference();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save conference');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (!conference) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/conferences" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to conferences
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Conference</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Edit conference</h1>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={saveConference}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={field} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Conference ID</label>
                <div
                  className={`${field} cursor-default bg-neutral-50 text-neutral-700`}
                  title="Conference ID cannot be changed"
                >
                  {conference.conferenceId || '—'}
                </div>
                <p className="mt-1 text-xs text-neutral-500">Set when the conference was created; it cannot be edited.</p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} min-h-[90px]`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="Email" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="Phone" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Contact person</label>
                <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={field} placeholder="Contact person" />
              </div>
            </div>
            <div className="text-xs text-neutral-600">
              Leadership (deacon, secretary, etc.) is configured on each church, not on the conference.
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 rounded border-neutral-300" />
              Active
            </label>

            <div className="flex gap-2">
              <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save conference
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}

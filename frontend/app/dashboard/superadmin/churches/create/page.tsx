'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminChurchCreatePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [conferenceId, setConferenceId] = useState('');
  const [conferences, setConferences] = useState<Array<{ _id: string; name: string; conferenceId?: string }>>([]);
  const [hasMainChurch, setHasMainChurch] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadReferences() {
      if (!token || !user || user.role !== 'SUPERADMIN') return;
      try {
        const [confRows, mainRows] = await Promise.all([
          apiFetch<Array<{ _id: string; name: string; conferenceId?: string }>>(
            '/api/superadmin/conferences',
            { token }
          ),
          apiFetch<Array<{ _id: string }>>('/api/superadmin/main-churches', { token }),
        ]);
        setConferences(confRows);
        setHasMainChurch(mainRows.length > 0);
        if (mainRows.length > 0 && confRows.length > 0) setConferenceId(confRows[0]._id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load references');
      }
    }
    loadReferences();
  }, [token, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const endpoint = hasMainChurch ? '/api/superadmin/sub-churches' : '/api/superadmin/main-churches';
      await apiFetch(endpoint, {
        method: 'POST',
        token,
        body: JSON.stringify({
          name,
          ...(hasMainChurch ? { conferenceId } : {}),
          address,
          city,
          stateOrProvince,
          postalCode,
          country,
          phone,
          email,
          contactPerson,
        }),
      });
      router.replace('/dashboard/superadmin/churches');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <Link
        href="/dashboard/superadmin/churches"
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to churches
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add church</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {hasMainChurch
            ? 'Main church already exists, so this church will be created as a sub church.'
            : 'No main church found, so this church will be created as the main church.'}
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            {hasMainChurch ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
                <select
                  required
                  value={conferenceId}
                  onChange={(e) => setConferenceId(e.target.value)}
                  className={field}
                >
                  <option value="">Select conference</option>
                  {conferences.map((conference) => (
                    <option key={conference._id} value={conference._id}>
                      {conference.name}
                      {conference.conferenceId ? ` (${conference.conferenceId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">State / Province</label>
            <input
              value={stateOrProvince}
              onChange={(e) => setStateOrProvince(e.target.value)}
              className={field}
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Postal code</label>
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact person</label>
            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={field} />
            </div>
          </div>
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create church
            </button>
            <Link
              href="/dashboard/superadmin/churches"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

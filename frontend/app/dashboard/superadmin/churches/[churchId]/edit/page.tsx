'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '../../types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminChurchEditPage() {
  const params = useParams();
  const churchId = params.churchId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [row, setRow] = useState<ChurchRecord | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [churchType, setChurchType] = useState<'MAIN' | 'SUB'>('MAIN');
  const [conferenceId, setConferenceId] = useState('');
  const [conferences, setConferences] = useState<Array<{ _id: string; name: string; conferenceId?: string }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !churchId) return;
    setLoadErr(null);
    const c = await apiFetch<ChurchRecord>(`/api/superadmin/churches/${churchId}`, { token });
    setRow(c);
    setName(c.name || '');
    setAddress(c.address || '');
    setCity(c.city || '');
    setStateOrProvince(c.stateOrProvince || '');
    setPostalCode(c.postalCode || '');
    setCountry(c.country || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setContactPerson(c.contactPerson || '');
    setIsActive(c.isActive !== false);
    setChurchType(c.churchType === 'SUB' ? 'SUB' : 'MAIN');
    setConferenceId(
      c.conference
        ? typeof c.conference === 'string'
          ? c.conference
          : c.conference._id || ''
        : ''
    );
  }, [token, churchId]);

  const loadReferences = useCallback(async () => {
    if (!token || !churchId) return;
    const confRows = await apiFetch<Array<{ _id: string; name: string; conferenceId?: string }>>(
      '/api/superadmin/conferences',
      { token }
    );
    setConferences(confRows);
  }, [token, churchId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && churchId) {
      Promise.all([load(), loadReferences()]).catch((e) =>
        setLoadErr(e instanceof Error ? e.message : 'Failed to load')
      );
    }
  }, [user, token, churchId, load, loadReferences]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const endpoint =
        churchType === 'SUB'
          ? `/api/superadmin/sub-churches/${churchId}`
          : `/api/superadmin/main-churches/${churchId}`;
      await apiFetch(endpoint, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name,
          ...(churchType === 'SUB' ? { conferenceId } : {}),
          address,
          city,
          stateOrProvince,
          postalCode,
          country,
          phone,
          email,
          contactPerson,
          isActive,
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

  if (loadErr) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-lg">
        <Link href="/dashboard/superadmin/churches" className="text-sm text-violet-700">
          ← Back
        </Link>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadErr}
        </p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
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
        <h1 className="text-xl font-semibold text-neutral-900">Edit church</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Church type</label>
            <select
              value={churchType}
              disabled
              className={field}
            >
              <option value="MAIN">Main church</option>
              <option value="SUB">Sub church</option>
            </select>
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
            {churchType === 'SUB' ? (
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
            ) : (
              <input
                readOnly
                value="Main church does not belong to a conference"
                className={`${field} bg-neutral-50 text-neutral-600`}
              />
            )}
            </div>
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
          <div className="flex items-center gap-2">
            <input
              id="churchActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-neutral-300"
            />
            <label htmlFor="churchActive" className="text-sm text-neutral-800">
              Church active
            </label>
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
              Save
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

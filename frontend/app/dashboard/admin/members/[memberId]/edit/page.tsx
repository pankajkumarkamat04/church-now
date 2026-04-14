'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, type AuthUser, type Gender, type MemberAddress } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

const emptyAddress: MemberAddress = {
  line1: '',
  line2: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  country: '',
};

export default function AdminMemberEditPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState<MemberAddress>(emptyAddress);
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !memberId) return;
    setLoadErr(null);
    const p = await apiFetch<AuthUser>(`/api/admin/members/${memberId}`, { token });
    setProfile(p);
    setFullName(p.fullName || '');
    setGender((p.gender as Gender) || '');
    setDateOfBirth(p.dateOfBirth || '');
    setAddress(p.address ? { ...emptyAddress, ...p.address } : emptyAddress);
    setIsActive(p.isActive !== false);
  }, [token, memberId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token && memberId) {
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, memberId, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/members/${memberId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          fullName,
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          address,
          isActive,
        }),
      });
      router.replace('/dashboard/admin/members');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  if (loadErr) {
    return (
      <div className="max-w-lg">
        <Link href="/dashboard/admin/members" className="text-sm text-sky-700">
          ← Back
        </Link>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadErr}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/admin/members"
        className="text-sm font-medium text-sky-700 hover:text-sky-900"
      >
        ← Back to members
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Edit member</h1>
        <p className="mt-1 text-sm text-neutral-600">{profile.email}</p>
        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | '')}
              className={field}
            >
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_SAY">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={field}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 1</label>
            <input
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              className={field}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 2</label>
            <input
              value={address.line2}
              onChange={(e) => setAddress({ ...address, line2: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">City</label>
            <input
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">State / province</label>
            <input
              value={address.stateOrProvince}
              onChange={(e) => setAddress({ ...address, stateOrProvince: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Postal code</label>
            <input
              value={address.postalCode}
              onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Country</label>
            <input
              value={address.country}
              onChange={(e) => setAddress({ ...address, country: e.target.value })}
              className={field}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 border-t border-neutral-100 pt-4">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-neutral-300"
            />
            <label htmlFor="isActive" className="text-sm text-neutral-800">
              Account active (member can sign in)
            </label>
          </div>
          {err ? (
            <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </button>
            <Link
              href="/dashboard/admin/members"
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

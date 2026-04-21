'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CreditCard, Layers, MapPin, UserRound } from 'lucide-react';
import { apiFetch, type MemberAddress } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

type ConferenceInfo = {
  _id?: string;
  conferenceId?: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  isActive?: boolean;
};

type Church = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  stateOrProvince?: string;
  postalCode?: string;
  conference?: ConferenceInfo | null;
  councils?: Array<{ _id: string; name: string; roles?: unknown[] }>;
};

type Profile = {
  id: string;
  email: string;
  firstName?: string;
  surname?: string;
  fullName: string;
  idNumber?: string;
  contactPhone?: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: MemberAddress;
  role: string;
  church: Church | null;
};

function formatAddress(a?: MemberAddress) {
  if (!a) return '—';
  const parts = [
    a.line1,
    a.line2,
    [a.city, a.stateOrProvince].filter(Boolean).join(', '),
    a.postalCode,
    a.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export default function MemberDashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [church, setChurch] = useState<Church | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [p, c] = await Promise.all([
      apiFetch<Profile>('/api/member/profile', { token }),
      apiFetch<Church>('/api/member/church', { token }),
    ]);
    setProfile(p);
    setChurch(c);
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessMemberPortal(user)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && canAccessMemberPortal(user) && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  if (!user || !canAccessMemberPortal(user)) {
    return null;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Member dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Your church, conference region, councils, and account shortcuts in one place.
        </p>
      </div>

      {err ? (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/member/subscriptions"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-700">Subscription</p>
            <CreditCard className="size-4 text-neutral-500" />
          </div>
          <p className="mt-2 text-lg font-semibold text-neutral-900">
            {profile?.fullName ? 'Manage plan' : 'Open'}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
            View plans and billing cycle
            <ArrowRight className="size-3.5" />
          </p>
        </Link>
        <Link
          href="/dashboard/member/account"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-700">Account details</p>
            <UserRound className="size-4 text-neutral-500" />
          </div>
          <p className="mt-2 text-lg font-semibold text-neutral-900">
            {profile?.fullName || 'Complete profile'}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
            Update personal and contact details
            <ArrowRight className="size-3.5" />
          </p>
        </Link>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-700">Church &amp; region</p>
            <MapPin className="size-4 text-neutral-500" />
          </div>
          <p className="mt-2 text-lg font-semibold text-neutral-900">{church?.name || '—'}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {typeof church?.conference === 'object' && church?.conference && 'name' in church.conference
              ? `Conference: ${church.conference.name}`
              : [church?.city, church?.country].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
        <Link
          href="/dashboard/member/councils"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-700">Councils</p>
            <Layers className="size-4 text-neutral-500" />
          </div>
          <p className="mt-2 text-lg font-semibold text-neutral-900">My councils</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
            See committees you serve on
            <ArrowRight className="size-3.5" />
          </p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500">
            <UserRound className="size-4" aria-hidden />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Profile</h2>
          </div>
          {profile ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Name</dt>
                <dd className="font-medium text-neutral-900">{profile.fullName || '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">ID</dt>
                <dd className="text-neutral-800">{profile.idNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Contact phone</dt>
                <dd className="text-neutral-800">{profile.contactPhone || '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="text-neutral-800">{profile.email}</dd>
              </div>
              {profile.gender ? (
                <div>
                  <dt className="text-neutral-500">Gender</dt>
                  <dd className="text-neutral-800">{profile.gender}</dd>
                </div>
              ) : null}
              {profile.dateOfBirth ? (
                <div>
                  <dt className="text-neutral-500">Date of birth</dt>
                  <dd className="text-neutral-800">{profile.dateOfBirth}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-neutral-500">Address</dt>
                <dd className="text-neutral-800">{formatAddress(profile.address)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Loading…</p>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500">
            <MapPin className="size-4" aria-hidden />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Your church &amp; conference</h2>
          </div>
          {church ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Congregation</p>
                <p className="mt-1 font-medium text-neutral-900">{church.name}</p>
                <p className="mt-2 text-sm text-neutral-600">
                  {[church.address, [church.city, church.stateOrProvince].filter(Boolean).join(', '), church.postalCode, church.country]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                {church.phone ? <p className="mt-2 text-sm text-neutral-600">Phone: {church.phone}</p> : null}
                {church.email ? <p className="text-sm text-neutral-600">Email: {church.email}</p> : null}
                {church.contactPerson ? (
                  <p className="text-sm text-neutral-600">Contact: {church.contactPerson}</p>
                ) : null}
              </div>
              {typeof church.conference === 'object' && church.conference && church.conference.name ? (
                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Conference (region)</p>
                  <p className="mt-1 font-medium text-neutral-900">{church.conference.name}</p>
                  {church.conference.conferenceId ? (
                    <p className="mt-1 text-xs text-neutral-500">ID: {church.conference.conferenceId}</p>
                  ) : null}
                  {church.conference.description ? (
                    <p className="mt-2 text-sm text-neutral-600">{church.conference.description}</p>
                  ) : null}
                  <div className="mt-2 grid gap-1 text-sm text-neutral-600 sm:grid-cols-2">
                    {church.conference.email ? <p>Email: {church.conference.email}</p> : null}
                    {church.conference.phone ? <p>Phone: {church.conference.phone}</p> : null}
                    {church.conference.contactPerson ? <p>Contact: {church.conference.contactPerson}</p> : null}
                  </div>
                </div>
              ) : null}
              <div className="border-t border-neutral-100 pt-3">
                <Link
                  href="/dashboard/member/councils"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:text-emerald-900"
                >
                  View my councils
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Loading…</p>
          )}
        </section>
      </div>
    </div>
  );
}

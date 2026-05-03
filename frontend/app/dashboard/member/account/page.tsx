'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch, type AuthUser, type Gender, type MemberAddress } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20';

const emptyAddress: MemberAddress = {
  line1: '',
  line2: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  country: '',
};

type ChurchOption = {
  _id: string;
  name: string;
  conference?:
    | string
    | {
        _id: string;
        name?: string;
        conferenceId?: string;
      }
    | null;
};

type ConferenceOption = { _id: string; name: string; conferenceId?: string };

type ChurchChangeRequest = {
  _id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  reviewNote?: string;
  createdAt: string;
  fromChurch?: { name?: string };
  toChurch?: { name?: string };
};

function extractConferenceIdFromChurch(church: AuthUser['church']): string {
  if (!church || typeof church !== 'object' || !('conference' in church)) return '';
  const conference = (church as { conference?: unknown }).conference;
  if (!conference) return '';
  if (typeof conference === 'string') return conference;
  if (typeof conference === 'object' && conference && '_id' in conference) {
    return String((conference as { _id?: string })._id || '');
  }
  return '';
}

export default function MemberAccountPage() {
  const { user, token, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState<MemberAddress>(emptyAddress);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [conferences, setConferences] = useState<ConferenceOption[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChurchChangeRequest[]>([]);
  const [targetConferenceId, setTargetConferenceId] = useState('');
  const [targetChurchId, setTargetChurchId] = useState('');
  const [reason, setReason] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadErr(null);
    const [p, conferenceOptions, churchOptions, requests] = await Promise.all([
      apiFetch<AuthUser>('/api/member/profile', { token }),
      apiFetch<ConferenceOption[]>('/api/public/conferences'),
      apiFetch<ChurchOption[]>('/api/public/churches'),
      apiFetch<ChurchChangeRequest[]>('/api/member/church-change-requests', { token }),
    ]);
    setProfile(p);
    setConferences(conferenceOptions);
    setChurches(churchOptions);
    setChangeRequests(requests);
    setFirstName(p.firstName || '');
    setSurname(p.surname || '');
    setIdNumber(p.idNumber || '');
    setContactPhone(p.contactPhone || '');
    setFullName(p.fullName || '');
    setGender((p.gender as Gender) || '');
    setDateOfBirth(p.dateOfBirth || '');
    setAddress(p.address ? { ...emptyAddress, ...p.address } : emptyAddress);
    const currentChurchId =
      p.church && typeof p.church === 'object' && '_id' in p.church ? String(p.church._id) : '';
    const currentConferenceId = extractConferenceIdFromChurch(p.church);
    const firstConference =
      conferenceOptions.find((conference) => conference._id !== currentConferenceId)?._id || '';
    setTargetConferenceId(firstConference);
    const firstChurch = churchOptions.find((church) => {
      const conf = church.conference;
      const conferenceMatches =
        conf && (typeof conf === 'string' ? conf === firstConference : conf._id === firstConference);
      return conferenceMatches && church._id !== currentChurchId;
    })?._id;
    setTargetChurchId(firstChurch || '');
  }, [token]);

  useEffect(() => {
    const currentChurchId =
      profile?.church && typeof profile.church === 'object' && '_id' in profile.church
        ? String(profile.church._id)
        : '';
    const options = churches.filter((church) => {
      const conf = church.conference;
      const conferenceMatches =
        conf &&
        targetConferenceId &&
        (typeof conf === 'string' ? conf === targetConferenceId : conf._id === targetConferenceId);
      return Boolean(conferenceMatches) && church._id !== currentChurchId;
    });
    setTargetChurchId((prev) => (prev && options.some((church) => church._id === prev) ? prev : options[0]?._id || ''));
  }, [targetConferenceId, churches, profile]);

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
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/member/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          firstName,
          surname,
          fullName,
          idNumber,
          contactPhone,
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          address,
        }),
      });
      await Promise.all([load(), refreshUser()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function submitChangeRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !targetChurchId) return;
    setErr(null);
    setRequestBusy(true);
    try {
      await apiFetch('/api/member/church-change-requests', {
        method: 'POST',
        token,
        body: JSON.stringify({ toConferenceId: targetConferenceId, toChurchId: targetChurchId, reason }),
      });
      setReason('');
      await load();
      await refreshUser();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to submit church change request');
    } finally {
      setRequestBusy(false);
    }
  }

  if (!user || !canAccessMemberPortal(user)) return null;

  if (loadErr) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadErr}</p>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-neutral-700" />
      </div>
    );
  }

  const filteredTargetChurches = churches.filter((church) => {
    const currentChurchId =
      profile?.church && typeof profile.church === 'object' && '_id' in profile.church
        ? String(profile.church._id)
        : '';
    const conf = church.conference;
    const conferenceMatches =
      conf &&
      targetConferenceId &&
      (typeof conf === 'string' ? conf === targetConferenceId : conf._id === targetConferenceId);
    return Boolean(conferenceMatches) && church._id !== currentChurchId;
  });

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Account details
        </h1>
        <p className="mt-1 text-sm text-neutral-600">Manage your member profile and residential address.</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Surname</label>
            <input value={surname} onChange={(e) => setSurname(e.target.value)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">ID</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Display name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender | '')} className={field}>
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
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 1</label>
            <input
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              className={field}
            />
          </div>
          <div className="md:col-span-2">
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
            <label className="mb-1 block text-xs font-medium text-neutral-600">State / Province</label>
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

          {err ? (
            <p className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save details
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Change church request</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitChangeRequest}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Requested conference</label>
            <select
              value={targetConferenceId}
              onChange={(e) => setTargetConferenceId(e.target.value)}
              className={field}
              required
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
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Current church</label>
            <input
              value={
                profile.church && typeof profile.church === 'object' && 'name' in profile.church
                  ? String(profile.church.name || '')
                  : ''
              }
              readOnly
              className={`${field} bg-neutral-50`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Requested church</label>
            <select
              value={targetChurchId}
              onChange={(e) => setTargetChurchId(e.target.value)}
              className={field}
              required
            >
              <option value="">Select church</option>
              {filteredTargetChurches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Reason (optional)</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={field}
            />
          </div>
          <button
            type="submit"
            disabled={requestBusy || !targetConferenceId || !targetChurchId}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {requestBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Send request for superadmin approval
          </button>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-900">Request history</h3>
          <div className="mt-2 space-y-2">
            {changeRequests.map((r) => (
              <div key={r._id} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <p className="font-medium text-neutral-900">
                  {r.fromChurch?.name || 'Current'} {'->'} {r.toChurch?.name || 'Requested'}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(r.createdAt).toLocaleString()} · Status: {r.status}
                </p>
                {r.reviewNote ? <p className="mt-1 text-xs text-neutral-600">{r.reviewNote}</p> : null}
              </div>
            ))}
            {changeRequests.length === 0 ? (
              <p className="text-sm text-neutral-500">No church change requests yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

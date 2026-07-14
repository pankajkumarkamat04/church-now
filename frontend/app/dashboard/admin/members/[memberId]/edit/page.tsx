'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, KeyRound, Loader2 } from 'lucide-react';
import { ResetUserPasswordModal } from '@/components/users/ResetUserPasswordModal';
import { ProvinceField } from '@/components/forms/ProvinceField';
import { MemberChurchRecordsFields } from '@/components/forms/MemberChurchRecordsFields';
import { useParams, useRouter } from 'next/navigation';
import {
  apiFetch,
  type AuthUser,
  type CouncilBadge,
  type Gender,
  type MemberAddress,
  type PositionHeld,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

const emptyAddress: MemberAddress = {
  line1: '',
  line2: '',
  city: '',
  stateOrProvince: '',
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
  const [isFullMember, setIsFullMember] = useState(false);
  const [membershipDate, setMembershipDate] = useState('');
  const [admittedBy, setAdmittedBy] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [baptismBy, setBaptismBy] = useState('');
  const [baptismPlace, setBaptismPlace] = useState('');
  const [councilBadges, setCouncilBadges] = useState<CouncilBadge[]>([]);
  const [positionsHeld, setPositionsHeld] = useState<PositionHeld[]>([]);
  const [address, setAddress] = useState<MemberAddress>(emptyAddress);
  const [isActive, setIsActive] = useState(true);
  const [memberBadgeType, setMemberBadgeType] = useState<'BADGED' | 'NON_BADGED'>('NON_BADGED');
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !memberId) return;
    setLoadErr(null);
    const p = await apiFetch<AuthUser>(`/api/admin/members/${memberId}`, { token });
    setProfile(p);
    setFullName(p.fullName || '');
    setGender((p.gender as Gender) || '');
    setDateOfBirth(p.dateOfBirth || p.date_of_birth || '');
    setIsFullMember(Boolean(p.isFullMember || p.membershipDate));
    setMembershipDate(p.membershipDate || p.membership_date || '');
    setAdmittedBy(p.admittedBy || '');
    setBaptismDate(p.baptismDate || p.baptism_date || '');
    setBaptismBy(p.baptismBy || '');
    setBaptismPlace(p.baptismPlace || '');
    setCouncilBadges(Array.isArray(p.councilBadges) ? p.councilBadges : []);
    setPositionsHeld(Array.isArray(p.positionsHeld) ? p.positionsHeld : []);
    setAddress(p.address ? { ...emptyAddress, ...p.address } : emptyAddress);
    setIsActive(p.isActive !== false);
    setMemberBadgeType(p.memberBadgeType === 'BADGED' ? 'BADGED' : 'NON_BADGED');
    setCouncilIds(Array.isArray(p.councilIds) ? p.councilIds : []);
  }, [token, memberId]);

  const loadCouncils = useCallback(async () => {
    if (!token) return;
    const rows = await apiFetch<Array<{ _id: string; name: string }>>('/api/admin/councils', {
      token,
    });
    setCouncils(rows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token && memberId) {
      load().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load'));
      loadCouncils().catch(() => {});
    }
  }, [user, token, memberId, load, loadCouncils]);

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
          isFullMember,
          membershipDate: membershipDate || null,
          admittedBy,
          baptismDate: baptismDate || null,
          baptismBy,
          baptismPlace,
          councilBadges,
          positionsHeld,
          address,
          isActive,
          councilIds,
          memberBadgeType,
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
      <div className="mx-auto w-full min-w-0 max-w-lg">
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
    <div className="dashboard-page dashboard-page--narrow w-full min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/admin/members" className="text-sm font-medium text-sky-700 hover:text-sky-900">
          ← Back to members
        </Link>
        <Link
          href={`/dashboard/admin/members/${memberId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          <Eye className="size-4" aria-hidden />
          View detail &amp; statement
        </Link>
      </div>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Edit member</h1>
        <p className="mt-1 text-sm text-neutral-600">{profile.email}</p>
        {profile.isActive !== false && token ? (
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100"
          >
            <KeyRound className="size-4" aria-hidden />
            Reset password
          </button>
        ) : null}
        <form className="mt-6 space-y-8" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Badge category</label>
              <select
                value={memberBadgeType}
                onChange={(e) => setMemberBadgeType(e.target.value as 'BADGED' | 'NON_BADGED')}
                className={field}
              >
                <option value="NON_BADGED">Non-badged</option>
                <option value="BADGED">Badged</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Councils</label>
              <select
                multiple
                value={councilIds}
                onChange={(e) => setCouncilIds(Array.from(e.target.selectedOptions).map((option) => option.value))}
                className={`${field} min-h-[110px]`}
              >
                {councils.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
            <ProvinceField
              value={address.stateOrProvince}
              onChange={(stateOrProvince) => setAddress({ ...address, stateOrProvince })}
              className={field}
              labelClassName="mb-1 block text-xs font-medium text-neutral-600"
            />
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
          </div>

          <div className="border-t border-neutral-100 pt-6">
            <MemberChurchRecordsFields
              fieldClass={field}
              councilOptions={councils}
              councilIds={councilIds}
              isFullMember={isFullMember}
              onIsFullMemberChange={setIsFullMember}
              membershipDate={membershipDate}
              onMembershipDateChange={setMembershipDate}
              admittedBy={admittedBy}
              onAdmittedByChange={setAdmittedBy}
              baptismDate={baptismDate}
              onBaptismDateChange={setBaptismDate}
              baptismBy={baptismBy}
              onBaptismByChange={setBaptismBy}
              baptismPlace={baptismPlace}
              onBaptismPlaceChange={setBaptismPlace}
              councilBadges={councilBadges}
              onCouncilBadgesChange={setCouncilBadges}
              positionsHeld={positionsHeld}
              onPositionsHeldChange={setPositionsHeld}
            />
          </div>

          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          <div className="flex gap-3 pt-2">
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
      {token && profile && resetOpen ? (
        <ResetUserPasswordModal
          open
          onClose={() => setResetOpen(false)}
          token={token}
          apiPath={`/api/admin/members/${memberId}/reset-password`}
          userEmail={profile.email}
          userName={profile.fullName || ''}
          accent="sky"
        />
      ) : null}
    </div>
  );
}

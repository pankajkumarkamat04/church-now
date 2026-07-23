'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, type Gender, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { MEMBER_CATEGORY_OPTIONS, type MemberCategory } from '@/lib/memberCategories';
import { ProvinceField } from '@/components/forms/ProvinceField';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type Conference = { _id: string; name: string; conferenceId?: string };
type Church = {
  _id: string;
  name: string;
  conference?: string | { _id: string } | null;
};
type Council = { _id: string; name: string };

export default function SuperadminMemberCreatePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [memberCategory, setMemberCategory] = useState<MemberCategory>('MEMBER');
  const [memberBadgeType, setMemberBadgeType] = useState<'BADGED' | 'NON_BADGED'>('NON_BADGED');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [membershipDate, setMembershipDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [country, setCountry] = useState('');
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activationLink, setActivationLink] = useState<string | null>(null);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);

  function toggleCouncil(id: string) {
    setCouncilIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadReferences() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      const [conferenceRaw, churchRows, councilRows] = await Promise.all([
        apiFetch<Conference[] | Paginated<Conference>>('/api/superadmin/conferences?limit=500', { token }),
        apiFetch<Church[]>('/api/superadmin/sub-churches', { token }),
        apiFetch<Council[]>('/api/superadmin/councils', { token }),
      ]);
      const conferenceRows = unwrapPaginatedArray(conferenceRaw);
      setConferences(conferenceRows);
      setChurches(churchRows);
      setCouncils(councilRows);
    }
    loadReferences().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load references'));
  }, [token, user]);

  const filteredChurches = useMemo(
    () =>
      churches.filter((church) => {
        const conf = church.conference;
        if (!conferenceId || !conf) return false;
        return typeof conf === 'string' ? conf === conferenceId : conf._id === conferenceId;
      }),
    [churches, conferenceId]
  );

  useEffect(() => {
    setChurchId((prev) => (prev && filteredChurches.some((church) => church._id === prev) ? prev : ''));
  }, [filteredChurches]);

  useEffect(() => {
    setCouncilIds((prev) => prev.filter((id) => councils.some((c) => c._id === id)));
  }, [councils]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!conferenceId || !churchId) {
      setErr('Select conference and church');
      return;
    }
    if (councilIds.length === 0) {
      setErr('Select at least one council');
      return;
    }
    if (!gender) {
      setErr('Select sex');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const created = await apiFetch<{
        activationLink?: string;
        message?: string;
      }>('/api/superadmin/members', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          firstName,
          surname,
          idNumber,
          contactPhone,
          conferenceId,
          churchId,
          councilIds,
          memberCategory,
          memberBadgeType,
          gender,
          dateOfBirth: dateOfBirth || undefined,
          membershipDate: membershipDate || undefined,
          baptismDate: baptismDate || undefined,
          address: { line1, line2, city, stateOrProvince, country },
        }),
      });
      setActivationLink(created.activationLink || null);
      setActivationMessage(
        created.message ||
          'Member created. Share the activation link so they can set their own password.'
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create member');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (activationLink || activationMessage) {
    return (
      <div className="dashboard-page dashboard-page--narrow w-full min-w-0">
        <Link href="/dashboard/superadmin/users" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to members
        </Link>
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">Member created</h1>
          <p className="mt-2 text-sm text-neutral-700">{activationMessage}</p>
          {activationLink ? (
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs font-medium text-violet-900">One-time activation link (expires in 1 hour)</p>
              <p className="mt-2 break-all text-sm text-violet-950">{activationLink}</p>
              <button
                type="button"
                className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                onClick={() => navigator.clipboard?.writeText(activationLink)}
              >
                Copy link
              </button>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-neutral-500">
            Do not invent or share a password for the member. They must set their own password via this link.
          </p>
          <Link
            href="/dashboard/superadmin/users"
            className="mt-6 inline-flex rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page dashboard-page--narrow w-full min-w-0">
      <Link href="/dashboard/superadmin/users" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to members
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add member</h1>
        <p className="mt-1 text-sm text-neutral-600">
          After create, you will receive a one-time activation link for the member to set their own password.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
              <select required value={conferenceId} onChange={(e) => setConferenceId(e.target.value)} className={field}>
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
              <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
              <select required value={churchId} onChange={(e) => setChurchId(e.target.value)} className={field}>
                <option value="">{conferenceId ? 'Select church' : 'Select a conference first'}</option>
                {filteredChurches.map((church) => (
                  <option key={church._id} value={church._id}>
                    {church.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Councils</label>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {councils.map((council) => {
                    const selected = councilIds.includes(council._id);
                    return (
                      <label
                        key={council._id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          selected
                            ? 'border-violet-300 bg-violet-50 text-violet-900'
                            : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCouncil(council._id)}
                          className="size-4 rounded border-neutral-300"
                        />
                        <span>{council.name}</span>
                      </label>
                    );
                  })}
                </div>
                {councils.length === 0 ? (
                  <p className="text-xs text-neutral-500">No global councils found yet.</p>
                ) : (
                  <p className="mt-2 text-xs text-neutral-500">Select one or more councils (global list).</p>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Surname</label>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">ID Number</label>
              <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Contact phone</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Date of birth</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Full membership date</label>
              <input
                type="date"
                value={membershipDate}
                onChange={(e) => setMembershipDate(e.target.value)}
                className={field}
              />
              <p className="mt-0.5 text-xs text-neutral-500">Optional — leave blank if not yet a full member</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Baptism date</label>
              <input type="date" value={baptismDate} onChange={(e) => setBaptismDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Sex</label>
              <select
                required
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | '')}
                className={field}
              >
                <option value="">Select sex</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Congregation badge</label>
              <select
                value={memberBadgeType}
                onChange={(e) => setMemberBadgeType(e.target.value as 'BADGED' | 'NON_BADGED')}
                className={field}
              >
                <option value="NON_BADGED">Non-badged</option>
                <option value="BADGED">Badged</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Member role option</label>
              <select
                value={memberCategory}
                onChange={(e) => setMemberCategory(e.target.value as MemberCategory)}
                className={field}
              >
                {MEMBER_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 1</label>
              <input value={line1} onChange={(e) => setLine1(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 2</label>
              <input value={line2} onChange={(e) => setLine2(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={field} />
            </div>
            <ProvinceField
              value={stateOrProvince}
              onChange={setStateOrProvince}
              className={field}
              labelClassName="mb-1 block text-xs font-medium text-neutral-600"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Country</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} className={field} />
            </div>
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create member
            </button>
            <Link href="/dashboard/superadmin/users" className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

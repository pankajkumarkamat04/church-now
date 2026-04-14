'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBase } from '@/lib/api';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminMemberCreatePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY'>('MALE');
  const [contactPhone, setContactPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [conferences, setConferences] = useState<Array<{ _id: string; name: string }>>([]);
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [conferenceIds, setConferenceIds] = useState<string[]>([]);
  const [memberCategory, setMemberCategory] = useState<'MEMBER' | 'PRESIDENT' | 'MODERATOR'>(
    'MEMBER'
  );
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadConferences() {
      try {
        const res = await fetch(`${getApiBase()}/api/public/conferences`);
        if (!res.ok) return;
        const rows = (await res.json()) as Array<{ _id: string; name: string }>;
        setConferences(rows);
        setConferenceIds((prev) => (prev.length ? prev : rows[0]?._id ? [rows[0]._id] : []));
      } catch {
        // no-op
      }
    }
    loadConferences();
  }, []);

  useEffect(() => {
    async function loadConferenceData() {
      if (!conferenceIds.length) {
        setCouncils([]);
        setCouncilIds([]);
        return;
      }
      try {
        const responses = await Promise.all(
          conferenceIds.map((id) => fetch(`${getApiBase()}/api/public/conferences/${id}/councils`))
        );
        const rows = await Promise.all(
          responses.map(async (res) =>
            res.ok ? ((await res.json()) as Array<{ _id: string; name: string }>) : []
          )
        );
        const merged = new Map<string, { _id: string; name: string }>();
        rows.flat().forEach((row) => merged.set(row._id, row));
        setCouncils(Array.from(merged.values()));
        setCouncilIds([]);
      } catch {
        setCouncils([]);
      }
    }
    loadConferenceData();
  }, [conferenceIds]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (conferenceIds.length === 0) {
      setErr('Select at least one conference');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/admin/members', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          firstName,
          surname,
          idNumber,
          conferenceIds,
          memberCategory,
          councilIds,
          dateOfBirth,
          gender,
          contactPhone,
          address: { line1, line2, city, stateOrProvince, postalCode, country },
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

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/admin/members"
        className="text-sm font-medium text-sky-700 hover:text-sky-900"
      >
        ← Back to members
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add member</h1>
        <p className="mt-1 text-sm text-neutral-600">
          New members are saved to your church via the API and can sign in immediately.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Password</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">First name</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Surname</label>
              <input required value={surname} onChange={(e) => setSurname(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Conferences</label>
              <select
                multiple
                value={conferenceIds}
                onChange={(e) => setConferenceIds(Array.from(e.target.selectedOptions).map((option) => option.value))}
                className={`${field} min-h-[110px]`}
              >
                {conferences.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Member category</label>
              <select
                value={memberCategory}
                onChange={(e) => setMemberCategory(e.target.value as 'MEMBER' | 'PRESIDENT' | 'MODERATOR')}
                className={field}
              >
                <option value="MEMBER">Member</option>
                <option value="PRESIDENT">President</option>
                <option value="MODERATOR">Moderator</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">ID</label>
              <input required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Councils</label>
              <select
                multiple
                value={councilIds}
                onChange={(e) =>
                  setCouncilIds(Array.from(e.target.selectedOptions).map((option) => option.value))
                }
                className={`${field} min-h-[110px]`}
              >
                {councils.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Date of birth</label>
              <input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY')} className={field}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_SAY">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Contact phone</label>
              <input required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 1</label>
              <input required value={line1} onChange={(e) => setLine1(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 2</label>
              <input value={line2} onChange={(e) => setLine2(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">City</label>
              <input required value={city} onChange={(e) => setCity(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">State / Province</label>
              <input required value={stateOrProvince} onChange={(e) => setStateOrProvince(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Postal code</label>
              <input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Country</label>
              <input required value={country} onChange={(e) => setCountry(e.target.value)} className={field} />
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
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create member
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

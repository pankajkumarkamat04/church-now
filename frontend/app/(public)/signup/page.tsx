'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import { getApiBase } from '@/lib/api';

type SignupChurch = {
  _id: string;
  name: string;
};
type Conference = { _id: string; name: string };
type Council = { _id: string; name: string };

export default function SignupPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [churchId, setChurchId] = useState('');
  const [churches, setChurches] = useState<SignupChurch[]>([]);
  const [conferenceIds, setConferenceIds] = useState<string[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [memberCategory, setMemberCategory] = useState<'MEMBER' | 'PRESIDENT' | 'MODERATOR'>(
    'MEMBER'
  );
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadBaseData() {
      try {
        const [churchRes, confRes] = await Promise.all([
          fetch(`${getApiBase()}/api/public/churches`),
          fetch(`${getApiBase()}/api/public/conferences`),
        ]);
        if (churchRes.ok) {
          const rows = (await churchRes.json()) as SignupChurch[];
          setChurches(rows);
          setChurchId((prev) => prev || rows[0]?._id || '');
        }
        if (confRes.ok) {
          const rows = (await confRes.json()) as Conference[];
          setConferences(rows);
          setConferenceIds((prev) => (prev.length ? prev : rows[0]?._id ? [rows[0]._id] : []));
        }
      } catch {
        // keep form usable even if dropdown fails
      }
    }
    loadBaseData();
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
          responses.map(async (res) => (res.ok ? ((await res.json()) as Council[]) : []))
        );
        const merged = new Map<string, Council>();
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
    if (conferenceIds.length === 0) {
      setError('Please select at least one conference');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register({
        email,
        password,
        churchId: churchId.trim(),
        conferenceIds,
        memberCategory,
        councilIds,
        firstName: firstName.trim(),
        surname: surname.trim(),
        idNumber: idNumber.trim(),
        dateOfBirth,
        gender,
        contactPhone: contactPhone.trim(),
        address: {
          line1: line1.trim(),
          line2: line2.trim(),
          city: city.trim(),
          stateOrProvince: stateOrProvince.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        },
      });
      router.replace('/dashboard/member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell maxWidthClassName="max-w-4xl">
      <div className="mb-6 flex justify-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
          <Church className="size-6 text-neutral-700" aria-hidden />
        </span>
      </div>
      <h1 className="text-center text-xl font-semibold text-neutral-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">Create your member account.</p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label htmlFor="conference" className="mb-1 block text-sm font-medium text-neutral-700">
            Conferences (you can select multiple)
          </label>
          <select
            id="conference"
            multiple
            value={conferenceIds}
            onChange={(e) => setConferenceIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            required
            className="min-h-[110px] w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            {conferences.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="memberCategory" className="mb-1 block text-sm font-medium text-neutral-700">
            Member category
          </label>
          <select
            id="memberCategory"
            value={memberCategory}
            onChange={(e) =>
              setMemberCategory(e.target.value as 'MEMBER' | 'PRESIDENT' | 'MODERATOR')
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="MEMBER">Member</option>
            <option value="PRESIDENT">President</option>
            <option value="MODERATOR">Moderator</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="councils" className="mb-1 block text-sm font-medium text-neutral-700">
            Councils (you can select multiple)
          </label>
          <select
            id="councils"
            multiple
            value={councilIds}
            onChange={(e) =>
              setCouncilIds(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
            className="min-h-[110px] w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            {councils.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="church" className="mb-1 block text-sm font-medium text-neutral-700">
            Church
          </label>
          <select
            id="church"
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="">Select church</option>
            {churches.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-neutral-700">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="surname" className="mb-1 block text-sm font-medium text-neutral-700">
            Surname
          </label>
          <input
            id="surname"
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="idNumber" className="mb-1 block text-sm font-medium text-neutral-700">
            ID
          </label>
          <input
            id="idNumber"
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="dob" className="mb-1 block text-sm font-medium text-neutral-700">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="gender" className="mb-1 block text-sm font-medium text-neutral-700">
            Gender
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) =>
              setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY')
            }
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_SAY">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium text-neutral-700">
            Contact phone
          </label>
          <input
            id="contactPhone"
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="line1" className="mb-1 block text-sm font-medium text-neutral-700">
            Residential address line 1
          </label>
          <input
            id="line1"
            type="text"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="line2" className="mb-1 block text-sm font-medium text-neutral-700">
            Residential address line 2
          </label>
          <input
            id="line2"
            type="text"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-neutral-700">
            City
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium text-neutral-700">
            State / Province
          </label>
          <input
            id="state"
            type="text"
            value={stateOrProvince}
            onChange={(e) => setStateOrProvince(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-neutral-700">
            Postal code
          </label>
          <input
            id="postalCode"
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-neutral-700">
            Country
          </label>
          <input
            id="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">At least 6 characters.</p>
        </div>

        {error ? (
          <p className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || loading}
          className="md:col-span-2 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy || loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

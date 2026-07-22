'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordRequirementsHint } from '@/components/auth/PasswordRequirementsHint';
import { ProvinceField } from '@/components/forms/ProvinceField';
import { validatePassword } from '@/lib/passwordPolicy';
import { apiFetch, type Gender } from '@/lib/api';
import { getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

const inputClass =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900';

type Conference = { _id: string; name: string; conferenceId?: string };
type Council = { _id: string; name: string };
type ChurchRow = {
  _id: string;
  name: string;
  conference?: string | { _id: string } | null;
  city?: string;
  country?: string;
};

export default function SignupPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [country, setCountry] = useState('Zimbabwe');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCouncil(id: string) {
    setCouncilIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    if (!loading && user) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<Conference[]>('/api/public/conferences'),
      apiFetch<Council[]>('/api/public/councils'),
      apiFetch<ChurchRow[]>('/api/public/churches'),
    ])
      .then(([confRows, councilRows, churchRows]) => {
        if (cancelled) return;
        setConferences(confRows);
        setCouncils(councilRows);
        setChurches(churchRows);
        if (confRows.length > 0) setConferenceId(confRows[0]._id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load signup options'))
      .finally(() => {
        if (!cancelled) setRefsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredChurches = useMemo(
    () =>
      churches.filter((c) => {
        const conf = c.conference;
        if (!conferenceId || !conf) return false;
        return typeof conf === 'string' ? conf === conferenceId : conf._id === conferenceId;
      }),
    [churches, conferenceId]
  );

  useEffect(() => {
    setChurchId((prev) =>
      prev && filteredChurches.some((c) => c._id === prev) ? prev : filteredChurches[0]?._id || ''
    );
  }, [filteredChurches]);

  useEffect(() => {
    setCouncilIds((prev) => {
      const kept = prev.filter((id) => councils.some((c) => c._id === id));
      if (kept.length > 0) return kept;
      return councils[0]?._id ? [councils[0]._id] : [];
    });
  }, [councils]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!conferenceId) {
      setError('Select a conference');
      return;
    }
    if (!churchId) {
      setError('Select a congregation in that conference');
      return;
    }
    if (councilIds.length === 0) {
      setError('Select at least one council');
      return;
    }
    if (!dateOfBirth.trim()) {
      setError('Date of birth is required');
      return;
    }
    if (!line1.trim() || !city.trim() || !stateOrProvince.trim() || !country.trim()) {
      setError('Complete your residential address (line 1, city, province, country)');
      return;
    }
    const policyErr = validatePassword(password);
    if (policyErr) {
      setError(policyErr);
      return;
    }
    setBusy(true);
    try {
      await register({
        email,
        password,
        churchId,
        conferenceIds: [conferenceId],
        councilIds,
        firstName,
        surname,
        idNumber,
        dateOfBirth,
        gender,
        contactPhone,
        address: {
          line1,
          line2,
          city,
          stateOrProvince,
          country,
        },
      });
      router.replace('/login?registered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
      <h1 className="text-center text-xl font-semibold text-neutral-900">Member registration</h1>
      <p className="mt-3 text-center text-sm text-neutral-600">
        Enter your congregation and contact details to create an account. Baptism, full membership, and council
        badging can be completed later after approval.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Conference</label>
            <select
              value={conferenceId}
              onChange={(e) => setConferenceId(e.target.value)}
              required
              disabled={!refsLoaded || conferences.length === 0}
              className={inputClass}
            >
              <option value="">{refsLoaded ? 'Select conference' : 'Loading…'}</option>
              {conferences.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.conferenceId ? ` (${c.conferenceId})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Congregation (church)</label>
            <select
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
              required
              disabled={!conferenceId || filteredChurches.length === 0}
              className={inputClass}
            >
              <option value="">
                {!conferenceId
                  ? 'Select a conference first'
                  : filteredChurches.length === 0
                    ? 'No churches in this conference'
                    : 'Select church'}
              </option>
              {filteredChurches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.city || c.country ? ` — ${[c.city, c.country].filter(Boolean).join(', ')}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Councils</label>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {councils.map((council) => {
                  const selected = councilIds.includes(council._id);
                  return (
                    <label
                      key={council._id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        selected
                          ? 'border-neutral-800 bg-white text-neutral-900'
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
                <p className="text-xs text-neutral-500">No global councils are configured yet.</p>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">
                  Select one or more councils. Badge dates (Volunteer / Ruwadzano) can be added later on your account.
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Password</label>
            <PasswordInput
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
            <PasswordRequirementsHint className="mt-1.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Surname</label>
            <input value={surname} onChange={(e) => setSurname(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">ID number</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className={inputClass}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Address line 1</label>
            <input value={line1} onChange={(e) => setLine1(e.target.value)} required className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Address line 2</label>
            <input value={line2} onChange={(e) => setLine2(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} required className={inputClass} />
          </div>
          <ProvinceField
            value={stateOrProvince}
            onChange={setStateOrProvince}
            required
            className={inputClass}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} required className={inputClass} />
          </div>
        </div>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !refsLoaded}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit registration'
          )}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600">
        Already approved?{' '}
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

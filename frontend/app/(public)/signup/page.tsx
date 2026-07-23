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

const PHONE_RE = /^\+?[0-9()\-\s]{7,20}$/;

const STEPS = [
  { id: 1, name: 'Affiliation' },
  { id: 2, name: 'Account' },
  { id: 3, name: 'Personal details' },
  { id: 4, name: 'Address + diaspora' },
  { id: 5, name: 'Review & privacy' },
] as const;

type Conference = { _id: string; name: string; conferenceId?: string };
type Council = { _id: string; name: string; abbreviation?: string };
type CouncilRegion = {
  _id: string;
  name: string;
  code?: string;
  council?: string | { _id: string; name?: string; abbreviation?: string };
};
type ChurchRow = {
  _id: string;
  name: string;
  conference?: string | { _id: string } | null;
  city?: string;
  country?: string;
};

function maxDateOfBirth(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isPastDob(value: string): boolean {
  if (!value.trim()) return false;
  const dob = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(dob.getTime()) && dob < today;
}

function councilLabel(council: Council): string {
  const abbr = String(council.abbreviation || '').trim();
  return abbr ? `${council.name} (${abbr})` : council.name;
}

function regionCouncilId(region: CouncilRegion): string {
  const c = region.council;
  if (!c) return '';
  return typeof c === 'string' ? c : String(c._id || '');
}

export default function SignupPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [councilRegionIds, setCouncilRegionIds] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<CouncilRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsLoaded, setRefsLoaded] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<Gender | ''>('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [country, setCountry] = useState('');
  const [isDiaspora, setIsDiaspora] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isZimbabwe = country.trim().toLowerCase() === 'zimbabwe';
  const currentStep = STEPS.find((s) => s.id === step) ?? STEPS[0];

  function toggleCouncil(id: string) {
    setCouncilIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleRegion(id: string) {
    setCouncilRegionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    if (!loading && user) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    setRefsLoading(true);
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
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load signup options'))
      .finally(() => {
        if (!cancelled) {
          setRefsLoading(false);
          setRefsLoaded(true);
        }
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
    setChurchId((prev) => (prev && filteredChurches.some((c) => c._id === prev) ? prev : ''));
  }, [filteredChurches]);

  useEffect(() => {
    setCouncilIds((prev) => prev.filter((id) => councils.some((c) => c._id === id)));
  }, [councils]);

  useEffect(() => {
    let cancelled = false;
    if (councilIds.length === 0) {
      setAvailableRegions([]);
      setCouncilRegionIds([]);
      setRegionsLoading(false);
      return;
    }
    setRegionsLoading(true);
    Promise.all(
      councilIds.map((id) =>
        apiFetch<CouncilRegion[]>(`/api/public/council-regions?councilId=${encodeURIComponent(id)}`)
      )
    )
      .then((lists) => {
        if (cancelled) return;
        const merged = lists.flat();
        const byId = new Map<string, CouncilRegion>();
        for (const row of merged) byId.set(row._id, row);
        const next = Array.from(byId.values());
        setAvailableRegions(next);
        setCouncilRegionIds((prev) => prev.filter((id) => next.some((r) => r._id === id)));
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableRegions([]);
        setCouncilRegionIds([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [councilIds]);

  function validateStep(stepId: number): string | null {
    if (stepId === 1) {
      if (!conferenceId) return 'Select a conference';
      if (!churchId) return 'Select a congregation in that conference';
      if (councilIds.length === 0) return 'Select at least one council';
      return null;
    }
    if (stepId === 2) {
      if (!email.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
      const policyErr = validatePassword(password);
      if (policyErr) return policyErr;
      return null;
    }
    if (stepId === 3) {
      if (!firstName.trim()) return 'First name is required';
      if (!surname.trim()) return 'Surname is required';
      if (!idNumber.trim()) return 'National ID / passport number is required';
      if (idNumber.trim().length < 3 || idNumber.trim().length > 40) {
        return 'National ID / passport number looks invalid';
      }
      if (!dateOfBirth.trim()) return 'Date of birth is required';
      if (!isPastDob(dateOfBirth)) return 'Date of birth must be a valid past date';
      if (!sex) return 'Select sex';
      if (!contactPhone.trim()) return 'Contact phone is required';
      if (!PHONE_RE.test(contactPhone.trim())) {
        return 'Enter a valid contact phone number (digits, spaces, or + country code)';
      }
      return null;
    }
    if (stepId === 4) {
      if (!country.trim()) return 'Country is required';
      if (!line1.trim()) return 'Address line 1 is required';
      if (!city.trim()) return 'City is required';
      if (!stateOrProvince.trim()) {
        return isZimbabwe ? 'Province is required' : 'State / region is required';
      }
      return null;
    }
    if (stepId === 5) {
      if (!privacyAccepted) return 'Please acknowledge the privacy notice before submitting';
      return null;
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(5, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 5) {
      goNext();
      return;
    }
    for (let s = 1; s <= 5; s += 1) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    if (!sex) {
      setError('Select sex');
      setStep(3);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register({
        email,
        password,
        churchId,
        conferenceIds: [conferenceId],
        councilIds,
        councilRegionIds: councilRegionIds.length > 0 ? councilRegionIds : undefined,
        isDiaspora,
        firstName,
        surname,
        idNumber,
        dateOfBirth,
        gender: sex,
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

  const selectedConference = conferences.find((c) => c._id === conferenceId);
  const selectedChurch = filteredChurches.find((c) => c._id === churchId) || churches.find((c) => c._id === churchId);
  const selectedCouncils = councils.filter((c) => councilIds.includes(c._id));
  const selectedRegions = availableRegions.filter((r) => councilRegionIds.includes(r._id));
  const showRegionPicker = regionsLoading || availableRegions.length > 0;

  return (
    <AuthShell maxWidthClassName="max-w-4xl">
      <div className="mb-6 flex justify-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
          <Church className="size-6 text-neutral-700" aria-hidden />
        </span>
      </div>
      <h1 className="text-center text-xl font-semibold text-neutral-900">Member registration</h1>
      <p className="mt-3 text-center text-sm text-neutral-600">
        Create your UCCZ Connect account in a few steps. Baptism, full membership, and council badging can be
        completed later after approval.
      </p>

      <nav aria-label="Registration progress" className="mt-6">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <li
                key={s.id}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  active
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : done
                      ? 'border-neutral-300 bg-neutral-100 text-neutral-800'
                      : 'border-neutral-200 bg-white text-neutral-500'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                <span className="mr-1 tabular-nums">{s.id}.</span>
                {s.name}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-sm text-neutral-600">
          Step {step} of {STEPS.length}: <span className="font-medium text-neutral-900">{currentStep.name}</span>
        </p>
      </nav>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        {error ? (
          <div
            id="signup-error-summary"
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
          >
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <fieldset className="space-y-4 rounded-lg border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-semibold text-neutral-900">Affiliation</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="signup-conference" className="mb-1 block text-sm font-medium text-neutral-700">
                  Conference <span className="text-red-600">*</span>
                </label>
                <select
                  id="signup-conference"
                  name="conference"
                  value={conferenceId}
                  onChange={(e) => setConferenceId(e.target.value)}
                  required
                  disabled={!refsLoaded || conferences.length === 0}
                  aria-describedby="signup-conference-help"
                  className={inputClass}
                >
                  <option value="">{refsLoading ? 'Loading conferences…' : 'Select conference'}</option>
                  {conferences.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.conferenceId ? ` (${c.conferenceId})` : ''}
                    </option>
                  ))}
                </select>
                <p id="signup-conference-help" className="mt-1 text-xs text-neutral-500">
                  Choose your conference before selecting a congregation.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="signup-church" className="mb-1 block text-sm font-medium text-neutral-700">
                  Congregation (church) <span className="text-red-600">*</span>
                </label>
                <select
                  id="signup-church"
                  name="church"
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
              <fieldset className="sm:col-span-2">
                <legend className="mb-1 text-sm font-medium text-neutral-700">
                  Councils <span className="text-red-600">*</span>
                </legend>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  {refsLoading ? (
                    <p className="text-xs text-neutral-500" role="status">
                      Loading councils…
                    </p>
                  ) : councils.length === 0 ? (
                    <p className="text-xs text-amber-800" role="status">
                      No councils are configured yet. Please contact your church administrator.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {councils.map((council) => {
                          const selected = councilIds.includes(council._id);
                          const inputId = `signup-council-${council._id}`;
                          return (
                            <label
                              key={council._id}
                              htmlFor={inputId}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                                selected
                                  ? 'border-neutral-800 bg-white text-neutral-900'
                                  : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
                              }`}
                            >
                              <input
                                id={inputId}
                                name="councils"
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleCouncil(council._id)}
                                className="size-4 rounded border-neutral-300"
                              />
                              <span>{councilLabel(council)}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">
                        Select one or more councils. Badge dates (Volunteer / Ruwadzano) can be added later on your
                        account.
                      </p>
                    </>
                  )}
                </div>
              </fieldset>

              {councilIds.length > 0 && showRegionPicker ? (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1 text-sm font-medium text-neutral-700">
                    Council regions <span className="text-neutral-400">(optional)</span>
                  </legend>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    {regionsLoading ? (
                      <p className="text-xs text-neutral-500" role="status">
                        Loading council regions…
                      </p>
                    ) : availableRegions.length === 0 ? (
                      <p className="text-xs text-neutral-500" role="status">
                        No regions are configured for the selected councils.
                      </p>
                    ) : (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {availableRegions.map((region) => {
                            const selected = councilRegionIds.includes(region._id);
                            const inputId = `signup-region-${region._id}`;
                            const parentId = regionCouncilId(region);
                            const parent = councils.find((c) => c._id === parentId);
                            const label = parent
                              ? `${region.name}${region.code ? ` (${region.code})` : ''} — ${councilLabel(parent)}`
                              : `${region.name}${region.code ? ` (${region.code})` : ''}`;
                            return (
                              <label
                                key={region._id}
                                htmlFor={inputId}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                                  selected
                                    ? 'border-neutral-800 bg-white text-neutral-900'
                                    : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
                                }`}
                              >
                                <input
                                  id={inputId}
                                  name="councilRegions"
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleRegion(region._id)}
                                  className="size-4 rounded border-neutral-300"
                                />
                                <span>{label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-neutral-500">
                          Optionally select one or more regions that apply to you within your councils.
                        </p>
                      </>
                    )}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="space-y-4 rounded-lg border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-semibold text-neutral-900">Account</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-neutral-700">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-neutral-700">
                  Password <span className="text-red-600">*</span>
                </label>
                <PasswordInput
                  id="signup-password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                  aria-describedby="signup-password-hint"
                />
                <PasswordRequirementsHint id="signup-password-hint" className="mt-1.5" />
              </div>
            </div>
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset className="space-y-4 rounded-lg border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-semibold text-neutral-900">Personal details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-first-name" className="mb-1 block text-sm font-medium text-neutral-700">
                  First name <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-first-name"
                  name="given-name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signup-surname" className="mb-1 block text-sm font-medium text-neutral-700">
                  Surname <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-surname"
                  name="family-name"
                  autoComplete="family-name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signup-id-number" className="mb-1 block text-sm font-medium text-neutral-700">
                  National ID number <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-id-number"
                  name="id-number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                  aria-describedby="signup-id-help"
                  className={inputClass}
                />
                <p id="signup-id-help" className="mt-1 text-xs text-neutral-500">
                  Used to identify membership records. Diaspora members may enter their national ID or passport
                  number.
                </p>
              </div>
              <div>
                <label htmlFor="signup-dob" className="mb-1 block text-sm font-medium text-neutral-700">
                  Date of birth <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-dob"
                  name="bday"
                  type="date"
                  autoComplete="bday"
                  max={maxDateOfBirth()}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signup-sex" className="mb-1 block text-sm font-medium text-neutral-700">
                  Sex <span className="text-red-600">*</span>
                </label>
                <select
                  id="signup-sex"
                  name="sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Gender | '')}
                  required
                  className={inputClass}
                >
                  <option value="">Select sex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label htmlFor="signup-phone" className="mb-1 block text-sm font-medium text-neutral-700">
                  Contact phone <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-phone"
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  placeholder="+263…"
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        ) : null}

        {step === 4 ? (
          <fieldset className="space-y-4 rounded-lg border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-semibold text-neutral-900">Address + diaspora</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="signup-country" className="mb-1 block text-sm font-medium text-neutral-700">
                  Country <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-country"
                  name="country-name"
                  autoComplete="country-name"
                  value={country}
                  onChange={(e) => {
                    const next = e.target.value;
                    const wasZw = country.trim().toLowerCase() === 'zimbabwe';
                    const nextIsZw = next.trim().toLowerCase() === 'zimbabwe';
                    setCountry(next);
                    if (wasZw !== nextIsZw) setStateOrProvince('');
                  }}
                  required
                  placeholder="e.g. Zimbabwe"
                  className={inputClass}
                />
              </div>
              {isZimbabwe ? (
                <ProvinceField
                  id="signup-province"
                  value={stateOrProvince}
                  onChange={setStateOrProvince}
                  required
                  className={inputClass}
                  label="Province"
                />
              ) : (
                <div>
                  <label htmlFor="signup-region" className="mb-1 block text-sm font-medium text-neutral-700">
                    State / region <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="signup-region"
                    name="address-level1"
                    autoComplete="address-level1"
                    value={stateOrProvince}
                    onChange={(e) => setStateOrProvince(e.target.value)}
                    required
                    placeholder="State, province, or region"
                    className={inputClass}
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="signup-line1" className="mb-1 block text-sm font-medium text-neutral-700">
                  Address line 1 <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-line1"
                  name="address-line1"
                  autoComplete="address-line1"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="signup-line2" className="mb-1 block text-sm font-medium text-neutral-700">
                  Address line 2 <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="signup-line2"
                  name="address-line2"
                  autoComplete="address-line2"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="signup-city" className="mb-1 block text-sm font-medium text-neutral-700">
                  City <span className="text-red-600">*</span>
                </label>
                <input
                  id="signup-city"
                  name="address-level2"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="signup-diaspora"
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-800"
                >
                  <input
                    id="signup-diaspora"
                    name="isDiaspora"
                    type="checkbox"
                    checked={isDiaspora}
                    onChange={(e) => setIsDiaspora(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-neutral-300"
                  />
                  <span>
                    <span className="font-medium text-neutral-900">I am a diaspora member</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      Check this if you live outside Zimbabwe. This is separate from your province or region.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </fieldset>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <fieldset className="space-y-3 rounded-lg border border-neutral-200 p-4">
              <legend className="px-1 text-sm font-semibold text-neutral-900">Review</legend>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Conference</dt>
                  <dd className="text-neutral-900">{selectedConference?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Congregation</dt>
                  <dd className="text-neutral-900">{selectedChurch?.name || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-neutral-500">Councils</dt>
                  <dd className="text-neutral-900">
                    {selectedCouncils.length > 0
                      ? selectedCouncils.map((c) => councilLabel(c)).join(', ')
                      : '—'}
                  </dd>
                </div>
                {selectedRegions.length > 0 ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-neutral-500">Council regions</dt>
                    <dd className="text-neutral-900">{selectedRegions.map((r) => r.name).join(', ')}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Email</dt>
                  <dd className="text-neutral-900">{email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Name</dt>
                  <dd className="text-neutral-900">
                    {[firstName, surname].filter(Boolean).join(' ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Date of birth</dt>
                  <dd className="text-neutral-900">{dateOfBirth || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Sex</dt>
                  <dd className="text-neutral-900">
                    {sex === 'MALE' ? 'Male' : sex === 'FEMALE' ? 'Female' : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Contact phone</dt>
                  <dd className="text-neutral-900">{contactPhone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">National ID</dt>
                  <dd className="text-neutral-900">{idNumber || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-neutral-500">Address</dt>
                  <dd className="text-neutral-900">
                    {[line1, line2, city, stateOrProvince, country].filter((x) => String(x || '').trim()).join(', ') ||
                      '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Diaspora</dt>
                  <dd className="text-neutral-900">{isDiaspora ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </fieldset>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm text-neutral-700">
                UCCZ Connect collects your contact details, national ID, date of birth and address to register you
                with your congregation, support membership administration, and communicate about approvals. See our{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-neutral-900 underline underline-offset-2"
                  target="_blank"
                >
                  privacy policy
                </Link>{' '}
                for purpose, retention and how to request corrections.
              </p>
              <label
                htmlFor="signup-privacy"
                className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-neutral-800"
              >
                <input
                  id="signup-privacy"
                  name="privacyAccepted"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  required
                  className="mt-0.5 size-4 rounded border-neutral-300"
                />
                <span>
                  I have read the privacy notice and agree to the processing of my personal data for church
                  membership administration. <span className="text-red-600">*</span>
                </span>
              </label>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={refsLoading || !refsLoaded || (step === 1 && councils.length === 0)}
              className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy || refsLoading || !refsLoaded || councils.length === 0}
              className="flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          )}
        </div>
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

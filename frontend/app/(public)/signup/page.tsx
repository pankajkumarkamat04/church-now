'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordRequirementsHint } from '@/components/auth/PasswordRequirementsHint';
import { validatePassword } from '@/lib/passwordPolicy';
import { apiFetch } from '@/lib/api';
import { getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

const inputClass =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900';

const PHONE_RE = /^\+?[0-9()\-\s]{7,20}$/;

type Conference = { _id: string; name: string; conferenceId?: string };
type ChurchRow = {
  _id: string;
  name: string;
  conference?: string | { _id: string } | null;
  city?: string;
  country?: string;
};

/**
 * Short self-registration: affiliation + account + contact only.
 * Church admin / superadmin complete ID, address, councils, baptism, etc. on approval.
 */
export default function SignupPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsLoaded, setRefsLoaded] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      apiFetch<ChurchRow[]>('/api/public/churches'),
    ])
      .then(([confRows, churchRows]) => {
        if (cancelled) return;
        setConferences(confRows);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!conferenceId) {
      setError('Select a conference');
      return;
    }
    if (!churchId) {
      setError('Select your congregation');
      return;
    }
    if (!firstName.trim() || !surname.trim()) {
      setError('Enter your first name and surname');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    const policyErr = validatePassword(password);
    if (policyErr) {
      setError(policyErr);
      return;
    }
    if (!PHONE_RE.test(contactPhone.trim())) {
      setError('Enter a valid contact phone number');
      return;
    }
    if (!privacyAccepted) {
      setError('Please acknowledge the privacy notice before submitting');
      return;
    }

    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        churchId,
        conferenceIds: [conferenceId],
        councilIds: [],
        firstName: firstName.trim(),
        surname: surname.trim(),
        contactPhone: contactPhone.trim(),
      });
      router.replace('/login?registered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell maxWidthClassName="max-w-lg">
      <div className="mb-6 flex justify-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
          <Church className="size-6 text-neutral-700" aria-hidden />
        </span>
      </div>
      <h1 className="text-center text-xl font-semibold text-neutral-900">Member registration</h1>
      <p className="mt-3 text-center text-sm text-neutral-600">
        Enter a few details to request membership. Your church admin will complete your full profile and approve your
        account before you can sign in.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        {error ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        ) : null}

        <div>
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
        </div>

        <div>
          <label htmlFor="signup-church" className="mb-1 block text-sm font-medium text-neutral-700">
            Congregation <span className="text-red-600">*</span>
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
        </div>

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

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-700">
            We collect your name, email, phone and congregation so your church can review and complete your membership
            record. See our{' '}
            <Link href="/privacy" className="font-medium text-neutral-900 underline underline-offset-2" target="_blank">
              privacy policy
            </Link>
            .
          </p>
          <label htmlFor="signup-privacy" className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-neutral-800">
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
              I agree to the processing of my details for membership registration.{' '}
              <span className="text-red-600">*</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy || refsLoading || !refsLoaded}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting…
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

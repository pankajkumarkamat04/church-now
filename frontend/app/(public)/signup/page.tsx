'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiFetch } from '@/lib/api';
import { getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<
    Array<{ _id: string; name: string; conference?: string | { _id: string } | null; city?: string; country?: string }>
  >([]);
  const [churchId, setChurchId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    apiFetch<Array<{ _id: string; name: string; conference?: string | { _id: string } | null; city?: string; country?: string }>>(
      '/api/public/churches'
    )
      .then((rows) => setChurches(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load churches'));
  }, []);

  const selectedConferenceId = useMemo(() => {
    const selected = churches.find((c) => c._id === churchId);
    if (!selected?.conference) return '';
    return typeof selected.conference === 'string' ? selected.conference : selected.conference._id || '';
  }, [churches, churchId]);
  const eligibleChurches = useMemo(
    () => churches.filter((c) => Boolean(c.conference)),
    [churches]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await register({
        email,
        password,
        churchId,
        conferenceIds: selectedConferenceId ? [selectedConferenceId] : [],
        memberCategory: 'MEMBER',
        firstName,
        surname,
        idNumber,
        dateOfBirth: '',
        gender: 'PREFER_NOT_SAY',
        contactPhone,
        address: {
          line1: '',
          city: '',
          stateOrProvince: '',
          postalCode: '',
          country: '',
        },
      });
      setSuccess(res.message || 'Registration submitted. Wait for church admin approval.');
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
        Register your own account and wait for your church admin to approve you.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Surname</label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Church</label>
            <select
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">Select church</option>
              {eligibleChurches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.city || c.country ? ` — ${[c.city, c.country].filter(Boolean).join(', ')}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Only churches linked to a conference are available for self-registration.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">ID number (optional)</label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
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

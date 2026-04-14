'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [churchSlug, setChurchSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        email,
        password,
        churchSlug: churchSlug.trim(),
        fullName: fullName.trim() || undefined,
      });
      router.replace('/dashboard/member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 flex justify-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
          <Church className="size-6 text-neutral-700" aria-hidden />
        </span>
      </div>
      <h1 className="text-center text-xl font-semibold text-neutral-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">
        Self-registration is for <strong className="font-medium text-neutral-800">members only</strong>.
        Admin accounts are created by a superadmin; there is no role choice here. You need your church’s
        public{' '}
        <strong className="font-medium text-neutral-800">site slug</strong> (e.g. if the site is{' '}
        <code className="rounded bg-neutral-100 px-1 text-xs">yoursite.com/grace-church</code>, use{' '}
        <code className="rounded bg-neutral-100 px-1 text-xs">grace-church</code>).
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-neutral-700">
            Church site slug
          </label>
          <input
            id="slug"
            type="text"
            autoComplete="off"
            value={churchSlug}
            onChange={(e) => setChurchSlug(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="e.g. grace-church"
          />
        </div>
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-neutral-700">
            Full name <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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

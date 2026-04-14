'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { apiFetch } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, password }),
      });
      setDone(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
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
      <h1 className="text-center text-xl font-semibold text-neutral-900">Set new password</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">
        Enter the email for your account, the token from your reset link, and a new password.
      </p>

      {done ? (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Password updated. Redirecting to sign in…
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
            />
          </div>
          <div>
            <label htmlFor="token" className="mb-1 block text-sm font-medium text-neutral-700">
              Reset token
            </label>
            <input
              id="token"
              type="text"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              placeholder="Paste token from email or link"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
              New password
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
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Confirm password
            </label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
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
                Saving…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <Loader2 className="size-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

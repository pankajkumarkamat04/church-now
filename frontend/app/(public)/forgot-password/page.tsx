'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Church, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string; resetToken?: string; resetLink?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
      setMessage(res.message);
      if (res.resetLink) {
        setMessage(
          `${res.message} (Dev: use this link to reset: ${res.resetLink})`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
      <h1 className="text-center text-xl font-semibold text-neutral-900">Forgot password</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">
        Enter your email. If an account exists, we will send reset instructions (check the server
        log in development, or your email when configured).
      </p>

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
            placeholder="you@example.com"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            {message}
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
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

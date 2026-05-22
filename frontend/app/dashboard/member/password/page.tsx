'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordRequirementsHint } from '@/components/auth/PasswordRequirementsHint';
import { apiFetch } from '@/lib/api';
import { validatePassword } from '@/lib/passwordPolicy';
import { canAccessMemberPortal, getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20';

export default function MemberPasswordPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessMemberPortal(user)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setErr('New password and confirmation do not match');
      return;
    }
    const policyErr = validatePassword(newPassword);
    if (policyErr) {
      setErr(policyErr);
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/member/change-password', {
        method: 'POST',
        token,
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(res.message || 'Password updated successfully');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  }

  if (!user || !canAccessMemberPortal(user)) return null;

  return (
    <div className="w-full min-w-0 max-w-lg">
      <Link
        href="/dashboard/member/account"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        ← Back to account
      </Link>
      <div className="mt-4 mb-6 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Change password
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Update your sign-in password. Enter your current password, then choose a new one.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Current password</label>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={field}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">New password</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={field}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <PasswordRequirementsHint className="mt-1" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Confirm new password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={field}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Update password
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Forgot your current password? Use{' '}
        <Link href="/reset-password" className="font-medium text-emerald-700 hover:text-emerald-900">
          reset password
        </Link>{' '}
        on the sign-in page (email link).
      </p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Copy, Loader2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';

type Mode = 'set' | 'link';

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  apiPath: string;
  userEmail: string;
  userName?: string;
  accent?: 'sky' | 'violet';
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export function ResetUserPasswordModal({
  open,
  onClose,
  token,
  apiPath,
  userEmail,
  userName,
  accent = 'sky',
}: Props) {
  const [mode, setMode] = useState<Mode>('set');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const btnClass =
    accent === 'violet'
      ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60'
      : 'inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60';

  useEffect(() => {
    if (!open) return;
    setMode('set');
    setPassword('');
    setConfirm('');
    setErr(null);
    setSuccess(null);
    setResetLink(null);
    setBusy(false);
  }, [open, userEmail]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setResetLink(null);

    if (mode === 'set') {
      if (password.length < 6) {
        setErr('Password must be at least 6 characters');
        return;
      }
      if (password !== confirm) {
        setErr('Passwords do not match');
        return;
      }
    }

    setBusy(true);
    try {
      const body =
        mode === 'set'
          ? { password: password.trim() }
          : { sendResetLink: true };
      const res = await apiFetch<{ message: string; resetLink?: string }>(apiPath, {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
      setSuccess(res.message);
      if (res.resetLink) setResetLink(res.resetLink);
      if (mode === 'set') {
        setPassword('');
        setConfirm('');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setSuccess('Link copied to clipboard.');
    } catch {
      setErr('Could not copy link — select and copy manually.');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
      >
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h3 id="reset-password-title" className="text-lg font-semibold text-neutral-900">
              Reset password
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              {userName ? (
                <>
                  <span className="font-medium text-neutral-800">{userName}</span>
                  <span className="text-neutral-500"> · </span>
                </>
              ) : null}
              {userEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('set');
                setErr(null);
                setSuccess(null);
                setResetLink(null);
              }}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${
                mode === 'set' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
              }`}
            >
              Set new password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('link');
                setErr(null);
                setSuccess(null);
                setResetLink(null);
              }}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${
                mode === 'link' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
              }`}
            >
              Generate reset link
            </button>
          </div>

          {mode === 'set' ? (
            <>
              <p className="text-xs text-neutral-600">
                The user can sign in immediately with this password. They should change it after logging in.
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">New password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Confirm password</label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  className={field}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-600">
              Creates a one-hour link the user can open to choose their own password (same as forgot-password flow).
            </p>
          )}

          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {success}
            </p>
          ) : null}
          {resetLink ? (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-600">Reset link (expires in 1 hour)</p>
              <p className="mt-2 break-all font-mono text-xs text-neutral-800">{resetLink}</p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                <Copy className="size-3.5" />
                Copy link
              </button>
            </div>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={busy} className={btnClass}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === 'set' ? 'Update password' : 'Generate link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {resetLink || success ? 'Done' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

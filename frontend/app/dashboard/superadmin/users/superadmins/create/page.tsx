'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminCreateSuperadminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/superadmin/users/superadmin', {
        method: 'POST',
        token,
        body: JSON.stringify({ email, password, fullName }),
      });
      router.replace('/dashboard/superadmin/admins');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/superadmin/admins"
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to admins
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add superadmin</h1>
        <p className="mt-1 text-sm text-neutral-600">Superadmins can manage all churches and users.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Password</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
            </div>
            <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
            </div>
          </div>
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create superadmin
            </button>
            <Link
              href="/dashboard/superadmin/admins"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

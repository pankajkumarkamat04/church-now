'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, Pencil } from 'lucide-react';
import { ResetUserPasswordModal } from '@/components/users/ResetUserPasswordModal';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString();
}

function normalizeMemberRoleLabel(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return 'MEMBER';
  const lowered = raw.toLowerCase();
  if (lowered.includes('spiritual leader') || lowered.includes('spiritual pastor')) {
    return 'Spiritual leader/Pastor';
  }
  return raw;
}

function safeReturnPath(from: string | null): string | null {
  if (!from || !from.startsWith('/dashboard/superadmin')) return null;
  return from;
}

export default function SuperadminUserViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId as string;
  const returnTo = safeReturnPath(searchParams.get('from'));
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);

  const backHref = returnTo || '/dashboard/superadmin/users';
  const editHref = `/dashboard/superadmin/users/${userId}/edit${
    returnTo ? `?from=${encodeURIComponent(returnTo)}` : ''
  }`;

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setErr(null);
    setLoadBusy(true);
    try {
      const p = await apiFetch<AuthUser & { id: string }>(`/api/superadmin/users/${userId}`, { token });
      setProfile(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load user');
      setProfile(null);
    } finally {
      setLoadBusy(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && userId) {
      load().catch(() => {});
    }
  }, [user, token, userId, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (loadBusy && !profile && !err) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (err || !profile) {
    return (
      <div className="dashboard-page dashboard-page--narrow w-full min-w-0">
        <Link href={backHref} className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back
        </Link>
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err || 'Not found'}
        </p>
      </div>
    );
  }

  const churchName =
    typeof profile.church === 'object' && profile.church && 'name' in profile.church
      ? profile.church.name
      : profile.adminChurches && profile.adminChurches.length > 0
        ? profile.adminChurches.map((c) => c.name).join(', ')
        : '—';

  return (
    <div className="dashboard-page dashboard-page--narrow w-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={backHref} className="text-sm font-medium text-violet-700 hover:text-violet-900">
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-neutral-900">User profile</h1>
          <p className="mt-1 text-sm text-neutral-600">{profile.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={editHref}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            <Pencil className="size-4" aria-hidden />
            Edit
          </Link>
          {profile.isActive !== false && token ? (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 shadow-sm hover:bg-violet-50"
            >
              <KeyRound className="size-4" aria-hidden />
              Reset password
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Identity &amp; contact</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-neutral-500">Email</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Full name</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{profile.fullName || profile.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Member ID</dt>
              <dd className="mt-0.5 font-mono text-sm text-neutral-900">{profile.memberId || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Account type</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{profile.role}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Badge</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {profile.memberBadgeType === 'BADGED' ? 'Badged' : 'Non-badged'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Office / category</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {normalizeMemberRoleLabel(
                  profile.memberRoleDisplay || profile.memberCategory || (profile.role === 'ADMIN' ? 'Church admin' : 'MEMBER')
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Contact phone</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{profile.contactPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">ID number</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{profile.idNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Date of birth</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{formatDate(profile.dateOfBirth || profile.date_of_birth || null)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Membership date</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {formatDate(profile.membershipDate || profile.membership_date || null)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Baptism date</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {formatDate(profile.baptismDate || profile.baptism_date || null)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-neutral-500">Church</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{churchName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-neutral-500">Councils</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {(profile.councils || []).length ? (profile.councils || []).map((c) => c.name).join(', ') : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-neutral-500">Account status</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {profile.approvalStatus === 'PENDING'
                  ? 'Pending approval'
                  : profile.isActive === false
                    ? 'Inactive'
                    : 'Active'}
              </dd>
            </div>
          </dl>
        </section>

        {profile.walletBalance != null ? (
          <section className="rounded-xl border border-violet-200 bg-violet-50 p-5">
            <h2 className="text-sm font-semibold text-violet-900">Wallet balance (stored USD)</h2>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-violet-950">
              USD {Number(profile.walletBalance || 0).toFixed(2)}
            </p>
          </section>
        ) : null}
      </div>

      {token && profile && resetOpen ? (
        <ResetUserPasswordModal
          open
          onClose={() => setResetOpen(false)}
          token={token}
          apiPath={`/api/superadmin/users/${userId}/reset-password`}
          userEmail={profile.email}
          userName={profile.fullName || profile.name || ''}
          accent="violet"
        />
      ) : null}
    </div>
  );
}

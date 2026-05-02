'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Pencil } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { normalizeDisplayCurrencyInput } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';

type PaymentLine = { paymentType: string; amount: number };

type StmtPayment = {
  _id: string;
  paymentLines?: PaymentLine[];
  amount: number;
  currency?: string;
  displayCurrency?: string;
  amountDisplayTotal?: number | null;
  paidAt?: string;
  source?: string;
  note?: string;
};

type StmtDeposit = {
  _id: string;
  amount: number;
  displayCurrency?: string;
  amountDisplay?: number | null;
  depositedAt?: string;
  depositedBy?: { fullName?: string; email?: string };
};

type Statement = {
  walletBalance: number;
  payments: StmtPayment[];
  deposits: StmtDeposit[];
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString();
}

export default function AdminMemberViewPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [statementErr, setStatementErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(true);

  const load = useCallback(async () => {
    if (!token || !memberId) return;
    setErr(null);
    setStatementErr(null);
    setLoadBusy(true);
    try {
      const p = await apiFetch<AuthUser>(`/api/admin/members/${memberId}`, { token });
      setProfile(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load member');
      setProfile(null);
      setStatement(null);
      setLoadBusy(false);
      return;
    }
    try {
      const s = await apiFetch<Statement>(`/api/admin/members/${memberId}/statement`, { token });
      setStatement(s);
    } catch (e) {
      setStatement(null);
      setStatementErr(e instanceof Error ? e.message : 'Could not load wallet statement');
    } finally {
      setLoadBusy(false);
    }
  }, [token, memberId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token && memberId) {
      load().catch(() => {});
    }
  }, [user, token, memberId, load]);

  if (!user || user.role !== 'ADMIN') return null;

  if (loadBusy && !profile && !err) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (err || !profile) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-2xl">
        <Link href="/dashboard/admin/members" className="text-sm font-medium text-sky-700 hover:text-sky-900">
          ← Back to members
        </Link>
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err || 'Not found'}</p>
      </div>
    );
  }

  const canEdit = profile.role === 'MEMBER';

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/admin/members" className="text-sm font-medium text-sky-700 hover:text-sky-900">
            ← Back to members
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Member profile &amp; statement</h1>
          <p className="mt-1 text-sm text-neutral-600">Read-only detail and wallet activity for this congregation account.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/dashboard/admin/members/${memberId}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600">
              Promoted church admin — profile edits use the users tools where available.
            </span>
          )}
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
              <dt className="text-xs font-medium text-neutral-500">Role</dt>
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
                {profile.memberRoleDisplay || profile.memberCategory || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Contact phone</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">{profile.contactPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Membership date</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {formatDate(profile.membershipDate || profile.membership_date || null)}
              </dd>
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

        <section className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <h2 className="text-sm font-semibold text-violet-900">Wallet balance (stored USD)</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-violet-950">
            USD {(statement?.walletBalance ?? profile.walletBalance ?? 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-violet-800">Credits from treasurer deposits minus allocations below.</p>
          {statementErr ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">{statementErr}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Deposit history</h2>
            <p className="text-xs text-neutral-500">Treasurer credits to this member&apos;s balance.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-600">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Deposited by</th>
                  <th className="px-4 py-2 font-medium">Amount (USD)</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.deposits || []).map((d) => (
                  <tr key={d._id} className="border-t border-neutral-100">
                    <td className="px-4 py-2">{d.depositedAt ? new Date(d.depositedAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2">{d.depositedBy?.fullName || d.depositedBy?.email || '—'}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">USD {Number(d.amount || 0).toFixed(2)}</span>
                      {d.displayCurrency && d.displayCurrency !== 'USD' && d.amountDisplay != null ? (
                        <span className="ml-1 block text-xs text-neutral-500">
                          entered {normalizeDisplayCurrencyInput(d.displayCurrency)}{' '}
                          {Number(d.amountDisplay).toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(statement?.deposits || []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No deposits recorded.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Payment allocations</h2>
            <p className="text-xs text-neutral-500">Spend from balance by category (stored in USD).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Lines</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.payments || []).map((r) => (
                  <tr key={r._id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 whitespace-nowrap">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</td>
                    <td className="max-w-[240px] px-4 py-2 text-xs">
                      {r.paymentLines && r.paymentLines.length > 0
                        ? r.paymentLines.map((line) => `${line.paymentType} ${line.amount.toFixed(2)}`).join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium">USD {Number(r.amount || 0).toFixed(2)}</span>
                      {r.displayCurrency && r.displayCurrency !== 'USD' && r.amountDisplayTotal != null ? (
                        <span className="ml-1 block text-xs text-neutral-500">
                          entered {normalizeDisplayCurrencyInput(r.displayCurrency)}{' '}
                          {Number(r.amountDisplayTotal).toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">{r.source || '—'}</td>
                    <td className="max-w-[180px] truncate px-4 py-2 text-xs text-neutral-600" title={r.note || ''}>
                      {r.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(statement?.payments || []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No payment allocations yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

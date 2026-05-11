'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, UserCheck, UserX, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 20;

type PendingMember = {
  id: string;
  _id: string;
  fullName: string;
  email: string;
  contactPhone?: string;
  memberId?: string;
  memberCategory?: string;
  memberBadgeType?: string;
  registrationSource?: string;
  createdAt?: string;
  church?: { _id?: string; name?: string } | string | null;
  approvalStatus?: string;
};

type ChurchOption = { _id: string; name: string };

export default function SuperadminPendingApprovalsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [churchFilter, setChurchFilter] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const paged = useMemo(() => members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [members, page]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (churchFilter) params.set('churchId', churchFilter);
      const data = await apiFetch<PendingMember[]>(
        `/api/superadmin/pending-approvals${params.toString() ? `?${params.toString()}` : ''}`,
        { token }
      );
      setMembers(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load pending approvals');
    }
  }, [token, churchFilter]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) load();
  }, [user, token, load]);

  useEffect(() => {
    if (!token || !user || user.role !== 'SUPERADMIN') return;
    apiFetch<ChurchOption[]>('/api/superadmin/sub-churches', { token })
      .then((rows) => setChurches(rows))
      .catch(() => {});
  }, [token, user]);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function churchName(m: PendingMember): string {
    if (!m.church) return '—';
    if (typeof m.church === 'string') return m.church;
    return m.church.name || '—';
  }

  async function approve(memberId: string) {
    if (!token) return;
    setBusyId(memberId);
    try {
      await apiFetch(`/api/superadmin/members/${memberId}/approve`, { method: 'PATCH', token });
      showToast('success', 'Member approved — they can now log in.');
      await load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(memberId: string, name: string) {
    if (!token) return;
    if (!window.confirm(`Reject and permanently remove the registration for "${name}"? This cannot be undone.`)) return;
    setBusyId(memberId);
    try {
      await apiFetch(`/api/superadmin/members/${memberId}/reject`, { method: 'PATCH', token });
      showToast('success', 'Registration rejected and removed.');
      await load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <XCircle className="size-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Platform management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Pending Approvals
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            All self-registered members across every church waiting for approval.
          </p>
        </div>
        {members.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
            <Clock className="size-4" />
            {members.length} pending
          </span>
        ) : null}
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      {/* Info banner */}
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-800">
          <strong>Approval required:</strong> Self-registered members cannot log in until an Admin or Superadmin
          approves their registration. Rejected registrations are permanently removed.
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-neutral-600">Filter by church</label>
        <select
          value={churchFilter}
          onChange={(e) => { setChurchFilter(e.target.value); setPage(1); }}
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
        >
          <option value="">All churches</option>
          {churches.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <UserCheck className="mb-3 size-10 text-emerald-400" />
            <p className="text-base font-medium text-neutral-700">No pending registrations</p>
            <p className="mt-1 text-sm text-neutral-500">
              {churchFilter ? 'No pending members for the selected church.' : 'There are no pending member registrations across the platform.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-3 md:hidden">
              {paged.map((m) => (
                <div key={m.id} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{m.fullName || '—'}</p>
                      <p className="text-xs text-neutral-600">{m.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                      Pending
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-neutral-600">
                    <span>Church: {churchName(m)}</span>
                    <span>Phone: {m.contactPhone || '—'}</span>
                    <span>Role: {m.memberCategory || 'MEMBER'}</span>
                    <span>
                      Registered: {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => approve(m.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserCheck className="size-3.5" />
                      {busyId === m.id ? 'Working…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => reject(m.id, m.fullName)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserX className="size-3.5" />
                      {busyId === m.id ? '…' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Church</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Badge</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-800">
                  {paged.map((m) => (
                    <tr key={m.id} className="border-b border-amber-50 bg-amber-50/20 last:border-0 hover:bg-amber-50/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{m.fullName || '—'}</p>
                        {m.memberId ? (
                          <p className="font-mono text-xs text-neutral-500">ID {m.memberId}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{m.email}</td>
                      <td className="px-4 py-3 text-neutral-600">{churchName(m)}</td>
                      <td className="px-4 py-3 text-neutral-600">{m.contactPhone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                          {m.memberCategory || 'MEMBER'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            m.memberBadgeType === 'BADGED'
                              ? 'rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800'
                              : 'rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700'
                          }
                        >
                          {m.memberBadgeType === 'BADGED' ? 'Badged' : 'Non-badged'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() => approve(m.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <UserCheck className="size-3.5" />
                            {busyId === m.id ? '…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() => reject(m.id, m.fullName)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <UserX className="size-3.5" />
                            {busyId === m.id ? '…' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} totalPages={totalPages} total={members.length} limit={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, UserCheck, UserX, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';

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
  church?: { name?: string } | string | null;
  approvalStatus?: string;
};

export default function AdminPendingApprovalsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const paged = useMemo(() => members.slice((page - 1) * pageSize, page * pageSize), [members, page, pageSize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const data = await apiFetch<PendingMember[]>('/api/admin/pending-approvals', { token });
      setMembers(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load pending approvals');
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) load();
  }, [user, token, load]);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function approve(memberId: string) {
    if (!token) return;
    setBusyId(memberId);
    setErr(null);
    try {
      await apiFetch(`/api/admin/members/${memberId}/approve`, { method: 'PATCH', token });
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
    setErr(null);
    try {
      await apiFetch(`/api/admin/members/${memberId}/reject`, { method: 'PATCH', token });
      showToast('success', 'Registration rejected and removed.');
      await load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
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
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Member management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Pending Approvals
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Members who self-registered and are waiting for your approval before they can log in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {members.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
              <Clock className="size-3.5" />
              {members.length} pending
            </span>
          ) : null}
        </div>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      {/* Info banner */}
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-800">
          <strong>How approval works:</strong> When a member registers themselves via the public signup page, their
          account is placed here. Approve to grant login access, or Reject to permanently remove their registration.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <UserCheck className="mb-3 size-10 text-emerald-400" />
            <p className="text-base font-medium text-neutral-700">All caught up!</p>
            <p className="mt-1 text-sm text-neutral-500">
              There are no pending member registrations right now.
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
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-neutral-600">
                    <span>Phone: {m.contactPhone || '—'}</span>
                    <span>Role: {m.memberCategory || 'MEMBER'}</span>
                    <span>Badge: {m.memberBadgeType === 'BADGED' ? 'Badged' : 'Non-badged'}</span>
                    <span>
                      Registered:{' '}
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
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
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
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
                      <td className="px-4 py-3 text-neutral-500 text-xs">
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
        <Pagination
          page={page}
          totalPages={totalPages}
          total={members.length}
          limit={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

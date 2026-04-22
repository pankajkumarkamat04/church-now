'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ChangeRequest = {
  _id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  reviewNote?: string;
  createdAt: string;
  user?: { fullName?: string; email?: string };
  fromChurch?: { name?: string };
  toChurch?: { name?: string };
};

export default function SuperadminChurchChangeRequestsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ChangeRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const data = await apiFetch<ChangeRequest[]>('/api/superadmin/church-change-requests', { token });
    setRows(data);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function decide(requestId: string, action: 'APPROVE' | 'REJECT') {
    if (!token) return;
    setErr(null);
    setBusyId(requestId);
    try {
      await apiFetch(`/api/superadmin/church-change-requests/${requestId}/decision`, {
        method: 'POST',
        token,
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to review request');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Church change requests
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Members can request church transfer. Only superadmin approval applies the change.
        </p>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Member</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">From</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">To</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Requested</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{r.user?.fullName || '—'}</p>
                    <p className="text-xs text-neutral-500">{r.user?.email || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{r.fromChurch?.name || '—'}</td>
                  <td className="px-4 py-3 text-neutral-700">{r.toChurch?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => decide(r._id, 'APPROVE')}
                          disabled={busyId === r._id}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                        >
                          {busyId === r._id ? <Loader2 className="size-3 animate-spin" /> : null}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(r._id, 'REJECT')}
                          disabled={busyId === r._id}
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="text-right text-xs text-neutral-500">Reviewed</p>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-500" colSpan={6}>
                    No church change requests.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

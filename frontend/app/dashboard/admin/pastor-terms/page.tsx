'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PastorAssignModal } from '@/components/church/PastorAssignModal';

type PastorTermRow = {
  _id: string;
  pastor?: { fullName?: string; email?: string; memberId?: string };
  termNumber: number;
  termEnd: string;
  status: 'ASSIGNED' | 'RENEWED' | 'TRANSFER_REQUIRED' | 'TRANSFERRED';
};

const ACTIVE_STATUSES: PastorTermRow['status'][] = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'];

function isWithinRenewWindow(termEnd: string): boolean {
  const end = new Date(termEnd);
  if (Number.isNaN(end.getTime())) return false;
  const now = new Date();
  const windowStart = new Date(end);
  windowStart.setMonth(windowStart.getMonth() - 1);
  return now >= windowStart && now <= end;
}

export default function AdminPastorTermsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PastorTermRow[]>([]);
  const [churchId, setChurchId] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hasActivePastor = rows.some((r) => ACTIVE_STATUSES.includes(r.status));

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function loadPage() {
      if (!token || user?.role !== 'ADMIN') return;
      const [terms, church] = await Promise.all([
        apiFetch<PastorTermRow[]>('/api/admin/pastor-terms', { token }),
        apiFetch<{ _id: string }>('/api/admin/church', { token }),
      ]);
      setRows(terms);
      setChurchId(church._id);
    }
    loadPage().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load term management'));
  }, [token, user]);

  async function renew(termId: string) {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/pastor-terms/${termId}/renew`, { method: 'POST', token });
      const terms = await apiFetch<PastorTermRow[]>('/api/admin/pastor-terms', { token });
      setRows(terms);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to renew term');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Spiritual leader term management</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Assign, renew, and track terms. Each term is 4 years; maximum 8 years before transfer is required.
        </p>
        {!hasActivePastor ? (
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Assign spiritual leader
          </button>
        ) : null}
        {err ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">{row.pastor?.fullName || '—'}</td>
                <td className="px-4 py-3">{row.pastor?.memberId || '—'}</td>
                <td className="px-4 py-3">{row.termNumber}/2</td>
                <td className="px-4 py-3">{new Date(row.termEnd).toLocaleDateString()}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      row.status === 'TRANSFER_REQUIRED' ||
                      row.termNumber >= 2 ||
                      !isWithinRenewWindow(row.termEnd)
                    }
                    onClick={() => renew(row._id)}
                    className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                  >
                    Renew 4 years
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No leader terms yet.</p> : null}
      </div>

      <PastorAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        token={token}
        churchId={churchId}
        mode="admin"
        onSaved={() => {
          apiFetch<PastorTermRow[]>('/api/admin/pastor-terms', { token }).then(setRows).catch(() => {});
        }}
      />
    </div>
  );
}

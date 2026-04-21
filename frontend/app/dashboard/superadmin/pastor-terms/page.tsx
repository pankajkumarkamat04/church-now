'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type ChurchOption = { _id: string; name: string; churchType?: 'MAIN' | 'SUB' };
type PastorRow = {
  _id: string;
  church?: { _id?: string; name?: string } | string;
  pastor?: { fullName?: string; email?: string; memberId?: string };
  termNumber: number;
  termEnd: string;
  status: 'ASSIGNED' | 'RENEWED' | 'TRANSFER_REQUIRED' | 'TRANSFERRED';
};

function isWithinRenewWindow(termEnd: string): boolean {
  const end = new Date(termEnd);
  if (Number.isNaN(end.getTime())) return false;
  const now = new Date();
  const windowStart = new Date(end);
  windowStart.setMonth(windowStart.getMonth() - 1);
  return now >= windowStart && now <= end;
}

export default function SuperadminPastorTermsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [rows, setRows] = useState<PastorRow[]>([]);
  const [transferToByTerm, setTransferToByTerm] = useState<Record<string, string>>({});
  const [busyTermId, setBusyTermId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      const [churchRows, pastorRows] = await Promise.all([
        apiFetch<ChurchOption[]>('/api/superadmin/churches', { token }),
        apiFetch<PastorRow[]>('/api/superadmin/pastor-terms', { token }),
      ]);
      setChurches(churchRows);
      setRows(pastorRows);
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load leader terms'));
  }, [token, user]);

  const filtered = useMemo(() => {
    if (!selectedChurchId) return rows;
    return rows.filter((r) => {
      const cid = typeof r.church === 'object' && r.church ? r.church._id : '';
      return cid === selectedChurchId;
    });
  }, [rows, selectedChurchId]);

  async function renew(termId: string) {
    if (!token) return;
    setBusyTermId(termId);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${termId}/renew`, { method: 'POST', token });
      const terms = await apiFetch<PastorRow[]>('/api/superadmin/pastor-terms', { token });
      setRows(terms);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to renew');
    } finally {
      setBusyTermId(null);
    }
  }

  async function transfer(termId: string) {
    if (!token) return;
    const toChurchId = transferToByTerm[termId];
    if (!toChurchId) return;
    setBusyTermId(termId);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${termId}/transfer`, {
        method: 'POST',
        token,
        body: JSON.stringify({ toChurchId }),
      });
      const terms = await apiFetch<PastorRow[]>('/api/superadmin/pastor-terms', { token });
      setRows(terms);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to transfer');
    } finally {
      setBusyTermId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Leader terms</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Spiritual leader term management
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Manage renewals and transfers across all churches.</p>
        </div>
        <div className="w-full sm:w-80 space-y-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">Filter by church</label>
          <select value={selectedChurchId} onChange={(e) => setSelectedChurchId(e.target.value)} className={field}>
            <option value="">All churches</option>
            {churches.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.churchType === 'MAIN' ? ' (main)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Ends</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {filtered.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">{typeof row.church === 'object' && row.church ? row.church.name || '—' : '—'}</td>
                <td className="px-4 py-3">{row.pastor?.fullName || '—'}</td>
                <td className="px-4 py-3">{row.pastor?.memberId || '—'}</td>
                <td className="px-4 py-3">{row.termNumber}/2</td>
                <td className="px-4 py-3">{new Date(row.termEnd).toLocaleDateString()}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busyTermId === row._id || row.status === 'TRANSFER_REQUIRED' || row.termNumber >= 2 || !isWithinRenewWindow(row.termEnd)}
                      onClick={() => renew(row._id)}
                      className="rounded-lg border border-violet-300 px-2 py-1 text-xs text-violet-800 disabled:opacity-50"
                    >
                      Renew
                    </button>
                    <select
                      value={transferToByTerm[row._id] || ''}
                      onChange={(e) => setTransferToByTerm((prev) => ({ ...prev, [row._id]: e.target.value }))}
                      className={field}
                    >
                      <option value="">Transfer to church</option>
                      {churches
                        .filter((c) => c._id !== (typeof row.church === 'object' && row.church ? row.church._id : ''))
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyTermId === row._id || !transferToByTerm[row._id]}
                      onClick={() => transfer(row._id)}
                      className="rounded-lg border border-amber-300 px-2 py-1 text-xs text-amber-800 disabled:opacity-50"
                    >
                      Transfer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No leader terms found.</p> : null}
      </div>
    </div>
  );
}

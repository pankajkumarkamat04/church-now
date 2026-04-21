'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PastorAssignModal } from './PastorAssignModal';

type PastorTerm = {
  _id: string;
  pastor?: { fullName?: string; email?: string; memberId?: string };
  church?: { _id?: string; name?: string };
  termNumber: number;
  termEnd: string;
  status: 'ASSIGNED' | 'RENEWED' | 'TRANSFER_REQUIRED' | 'TRANSFERRED';
};

type ChurchOption = { _id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  token: string | null;
  churchId: string;
  churchName: string;
};

export function ChurchPastorManageModal({ open, onClose, token, churchId, churchName }: Props) {
  const [rows, setRows] = useState<PastorTerm[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferToByTerm, setTransferToByTerm] = useState<Record<string, string>>({});
  const [busyTermId, setBusyTermId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!token || !churchId) return;
    const [terms, allChurches] = await Promise.all([
      apiFetch<PastorTerm[]>(`/api/superadmin/pastor-terms?churchId=${encodeURIComponent(churchId)}`, { token }),
      apiFetch<ChurchOption[]>('/api/superadmin/churches', { token }),
    ]);
    setRows(terms);
    setChurches(allChurches);
  }

  useEffect(() => {
    if (!open || !token || !churchId) return;
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load pastor terms'));
  }, [open, token, churchId]);

  async function renew(termId: string) {
    if (!token) return;
    setBusyTermId(termId);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${termId}/renew`, { method: 'POST', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to renew term');
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
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to transfer pastor');
    } finally {
      setBusyTermId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Pastor management</p>
            <h3 className="text-lg font-semibold text-neutral-900">{churchName}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="mb-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Assign spiritual pastor
          </button>
          {err ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                  <th className="px-4 py-3 font-medium">Pastor</th>
                  <th className="px-4 py-3 font-medium">Member ID</th>
                  <th className="px-4 py-3 font-medium">Term</th>
                  <th className="px-4 py-3 font-medium">Ends</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-neutral-800">
                {rows.map((row) => (
                  <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3">{row.pastor?.fullName || row.pastor?.email || '—'}</td>
                    <td className="px-4 py-3">{row.pastor?.memberId || '—'}</td>
                    <td className="px-4 py-3">{row.termNumber}/2</td>
                    <td className="px-4 py-3">{new Date(row.termEnd).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => renew(row._id)}
                          disabled={busyTermId === row._id || row.termNumber >= 2 || row.status === 'TRANSFER_REQUIRED'}
                          className="rounded-lg border border-violet-300 px-2 py-1 text-xs font-medium text-violet-800 disabled:opacity-50"
                        >
                          Renew
                        </button>
                        <select
                          value={transferToByTerm[row._id] || ''}
                          onChange={(e) => setTransferToByTerm((prev) => ({ ...prev, [row._id]: e.target.value }))}
                          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs"
                        >
                          <option value="">Transfer church</option>
                          {churches
                            .filter((c) => c._id !== churchId)
                            .map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => transfer(row._id)}
                          disabled={busyTermId === row._id || !transferToByTerm[row._id]}
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-medium text-amber-800 disabled:opacity-50"
                        >
                          Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No pastor assignments yet.</p> : null}
          </div>
        </div>
      </div>
      <PastorAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        token={token}
        churchId={churchId}
        mode="superadmin"
        onSaved={() => {
          load().catch(() => {});
        }}
      />
    </div>
  );
}

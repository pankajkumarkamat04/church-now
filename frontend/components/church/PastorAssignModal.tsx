'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  token: string | null;
  churchId: string;
  mode: 'admin' | 'superadmin';
  onSaved: () => void;
};

export function PastorAssignModal({ open, onClose, token, churchId, mode, onSaved }: Props) {
  const [members, setMembers] = useState<AuthUser[]>([]);
  const [pastorUserId, setPastorUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token || !churchId) return;
    const path =
      mode === 'superadmin'
        ? `/api/superadmin/users?churchId=${encodeURIComponent(churchId)}`
        : '/api/admin/members';
    apiFetch<AuthUser[]>(path, { token })
      .then((rows) => {
        const filtered = rows.filter((r) => r.role === 'MEMBER' || r.role === 'ADMIN');
        setMembers(filtered);
        setPastorUserId(filtered[0]?.id || '');
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load members'));
  }, [open, token, churchId, mode]);

  async function onAssign() {
    if (!token || !pastorUserId || !churchId) return;
    setErr(null);
    setBusy(true);
    try {
      const assignPath = mode === 'superadmin' ? '/api/superadmin/pastor-terms/assign' : '/api/admin/pastor-terms/assign';
      await apiFetch(assignPath, {
        method: 'POST',
        token,
        body: JSON.stringify(mode === 'superadmin' ? { churchId, pastorUserId } : { pastorUserId }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to assign pastor');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Assign spiritual pastor/leader</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
            <X className="size-4" />
          </button>
        </div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Church member/admin</label>
        <select
          value={pastorUserId}
          onChange={(e) => setPastorUserId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select member/admin</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {(m.memberId || '—').toString()} - {m.fullName || m.email}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-neutral-500">Each assignment is 4 years. One renewal is allowed (max 8 years total).</p>
        {err ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onAssign()}
            disabled={busy || !pastorUserId}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

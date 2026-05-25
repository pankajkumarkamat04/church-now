'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export type PendingDeletion = {
  _id: string;
  targetId?: string;
  status: string;
  reason?: string;
  approvals?: { treasurer?: boolean; viceTreasurer?: boolean; deacon?: boolean };
  approvalsComplete?: boolean;
  canCurrentUserApproveDeletion?: boolean;
  canApproveAsTreasurer?: boolean;
  canApproveAsViceTreasurer?: boolean;
  canApproveAsDeacon?: boolean;
};

type Props = {
  token: string | null;
  targetKind: 'PAYMENT' | 'EXPENSE' | 'REMITTANCE';
  targetId: string;
  pendingDeletion?: PendingDeletion | null;
  onChanged: () => void | Promise<void>;
  className?: string;
};

function approvalLabel(key: 'treasurer' | 'viceTreasurer' | 'deacon') {
  if (key === 'treasurer') return 'Treasurer';
  if (key === 'viceTreasurer') return 'Vice treasurer';
  return 'Deacon';
}

export function TransactionDeletionActions({
  token,
  targetKind,
  targetId,
  pendingDeletion,
  onChanged,
  className = '',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function requestDeletion() {
    if (!token) return;
    const reason = window.prompt('Reason for deletion (optional):') ?? '';
    if (!window.confirm('Request deletion? Treasurer, vice treasurer, and deacon must all approve before it is removed.')) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/admin/transaction-deletions', {
        method: 'POST',
        token,
        body: JSON.stringify({ targetKind, targetId, reason }),
      });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to request deletion');
    } finally {
      setBusy(false);
    }
  }

  async function approveDeletion() {
    if (!token || !pendingDeletion?._id) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/admin/transaction-deletions/${pendingDeletion._id}/approve`, {
        method: 'POST',
        token,
      });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to approve deletion');
    } finally {
      setBusy(false);
    }
  }

  async function cancelDeletion() {
    if (!token || !pendingDeletion?._id) return;
    if (!window.confirm('Cancel this deletion request?')) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/admin/transaction-deletions/${pendingDeletion._id}`, {
        method: 'DELETE',
        token,
      });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  }

  const pending = pendingDeletion?.status === 'PENDING' ? pendingDeletion : null;
  const approvals = pending?.approvals || {};

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      {err ? <span className="text-xs text-red-700">{err}</span> : null}
      {pending ? (
        <>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
            Deletion pending
          </span>
          <span className="text-[10px] text-neutral-600">
            {approvalLabel('treasurer')}: {approvals.treasurer ? '✓' : '—'} · {approvalLabel('viceTreasurer')}:{' '}
            {approvals.viceTreasurer ? '✓' : '—'} · {approvalLabel('deacon')}: {approvals.deacon ? '✓' : '—'}
          </span>
          {pending.canCurrentUserApproveDeletion ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void approveDeletion()}
              className="inline-flex items-center text-xs font-medium text-emerald-700 hover:underline disabled:opacity-60"
            >
              {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
              Approve deletion
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancelDeletion()}
            className="text-xs text-neutral-600 hover:underline disabled:opacity-60"
          >
            Cancel request
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void requestDeletion()}
          className="inline-flex items-center text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
        >
          {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Trash2 className="mr-1 size-3" />}
          Request delete
        </button>
      )}
    </div>
  );
}

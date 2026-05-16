'use client';

import { X } from 'lucide-react';
import { pastorTermCycleLabel, pastorTermLengthLabel } from '@/lib/pastorTerms';

export type SpiritualLeaderRemoveTarget = {
  id: string;
  leadershipOnly: boolean;
  churchName: string;
  churchId: string;
  pastorName: string;
  pastorEmail?: string;
  memberId?: string;
  termNumber?: number;
  termLengthYears?: number | null;
  termStart?: string | null;
  termEnd?: string | null;
  status?: string;
};

type Props = {
  open: boolean;
  target: SpiritualLeaderRemoveTarget | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(status?: string, leadershipOnly?: boolean) {
  if (status === 'CATEGORY_ONLY') return 'PASTOR category (no term record yet)';
  if (leadershipOnly) return 'Church leadership (no term record)';
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

export function RemoveSpiritualLeaderModal({ open, target, busy, onClose, onConfirm }: Props) {
  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-leader-title"
      >
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div>
            <h3 id="remove-leader-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Remove spiritual leader?
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Review the details below. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-3 text-sm">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/50">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Church</dt>
              <dd className="mt-0.5 font-semibold text-neutral-900 dark:text-neutral-100">{target.churchName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">Pastor / leader</dt>
              <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{target.pastorName}</dd>
            </div>
            {target.memberId ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Member ID</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.memberId}</dd>
              </div>
            ) : null}
            {target.pastorEmail ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Email</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.pastorEmail}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium text-neutral-500">Status</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                {statusLabel(target.status, target.leadershipOnly)}
              </dd>
            </div>
            {!target.leadershipOnly ? (
              <>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Term</dt>
                  <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                    {target.termNumber != null
                      ? pastorTermCycleLabel(target.termNumber, target.termLengthYears)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Term length</dt>
                  <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                    {pastorTermLengthLabel(target.termLengthYears)}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-medium text-neutral-500">Start</dt>
                    <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{fmtDate(target.termStart)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-neutral-500">End</dt>
                    <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{fmtDate(target.termEnd)}</dd>
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {target.status === 'CATEGORY_ONLY'
                  ? 'This member has PASTOR category without a formal term. Removing clears PASTOR category and spiritual pastor leadership if set.'
                  : 'This leader is assigned in church leadership only. Removing clears the spiritual pastor role for this congregation.'}
              </p>
            )}
          </dl>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
          >
            {busy ? 'Removing…' : 'Yes, remove leader'}
          </button>
        </div>
      </div>
    </div>
  );
}

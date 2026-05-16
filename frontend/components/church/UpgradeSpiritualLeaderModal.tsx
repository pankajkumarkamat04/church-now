'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  MAX_PASTOR_TERM_CYCLES,
  PASTOR_TERM_LENGTH_OPTIONS,
  maxPastorTermTotalYears,
  pastorTermCycleLabel,
  pastorTermLengthLabel,
  pastorTermRenewalHint,
  type PastorTermLengthYears,
} from '@/lib/pastorTerms';

export type UpgradeSpiritualLeaderTarget = {
  userId: string;
  fullName: string;
  email?: string;
  memberId?: string;
  contactPhone?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  memberCategory?: string;
};

type Props = {
  open: boolean;
  churchName: string;
  target: UpgradeSpiritualLeaderTarget | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (termLengthYears: PastorTermLengthYears) => void;
};

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function UpgradeSpiritualLeaderModal({ open, churchName, target, busy, onClose, onConfirm }: Props) {
  const [termLengthYears, setTermLengthYears] = useState<PastorTermLengthYears>(4);

  useEffect(() => {
    if (open) setTermLengthYears(4);
  }, [open, target?.userId]);

  const termPreview = useMemo(() => {
    const start = new Date();
    const end = addYears(start, termLengthYears);
    const maxYears = maxPastorTermTotalYears(termLengthYears);
    return { start, end, maxYears };
  }, [termLengthYears]);

  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-leader-title"
      >
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div>
            <h3 id="upgrade-leader-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Upgrade to spiritual leader
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Review member details and choose a pastor term before confirming.
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 dark:border-violet-800 dark:bg-violet-950/40">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">Church</p>
            <p className="mt-0.5 font-semibold text-violet-950 dark:text-violet-100">{churchName}</p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-500">Member name</dt>
              <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{target.fullName}</dd>
            </div>
            {target.memberId ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Member ID</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.memberId}</dd>
              </div>
            ) : null}
            {target.email ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Email</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.email}</dd>
              </div>
            ) : null}
            {target.contactPhone ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Phone</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.contactPhone}</dd>
              </div>
            ) : null}
            {target.dateOfBirth ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Date of birth</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                  {new Date(target.dateOfBirth).toLocaleDateString()}
                </dd>
              </div>
            ) : null}
            {target.gender ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">Gender</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.gender}</dd>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-medium text-neutral-500">Current category</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.memberCategory || 'MEMBER'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">System role</dt>
                <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{target.role || 'MEMBER'}</dd>
              </div>
            </div>
          </dl>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
            <label htmlFor="upgrade-term-length" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Spiritual leader term length
            </label>
            <select
              id="upgrade-term-length"
              value={termLengthYears}
              onChange={(e) => setTermLengthYears(Number(e.target.value) === 1 ? 1 : 4)}
              disabled={busy}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {PASTOR_TERM_LENGTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{pastorTermRenewalHint(termLengthYears)}</p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">Term summary</p>
            <ul className="mt-2 space-y-1.5 text-sky-950 dark:text-sky-100">
              <li>
                <span className="text-sky-700 dark:text-sky-400">Assignment: </span>
                {pastorTermCycleLabel(1, termLengthYears)}
              </li>
              <li>
                <span className="text-sky-700 dark:text-sky-400">Length: </span>
                {pastorTermLengthLabel(termLengthYears)}
              </li>
              <li>
                <span className="text-sky-700 dark:text-sky-400">Start: </span>
                {fmtDate(termPreview.start)}
              </li>
              <li>
                <span className="text-sky-700 dark:text-sky-400">End: </span>
                {fmtDate(termPreview.end)}
              </li>
              <li>
                <span className="text-sky-700 dark:text-sky-400">Max service: </span>
                {termPreview.maxYears} year{termPreview.maxYears === 1 ? '' : 's'} ({MAX_PASTOR_TERM_CYCLES} terms, one renewal)
              </li>
            </ul>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Confirming will set this member to <strong>PASTOR</strong> category, assign them as spiritual pastor for this
            church, and create the term record shown above.
          </p>
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
            onClick={() => onConfirm(termLengthYears)}
            disabled={busy}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? 'Upgrading…' : 'Confirm upgrade & assign term'}
          </button>
        </div>
      </div>
    </div>
  );
}

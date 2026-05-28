'use client';

import { X } from 'lucide-react';
import type { ChurchRecord } from '@/app/dashboard/superadmin/churches/types';
import { ChurchLeadershipEditor } from '@/components/church/ChurchLeadershipEditor';

export { leadershipSummary } from '@/components/church/ChurchLeadershipEditor';

const fieldBtn =
  'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700';

type ChurchLeadershipModalProps = {
  open: boolean;
  onClose: () => void;
  churchId: string;
  churchType: 'MAIN' | 'SUB';
  churchName: string;
  token: string | null;
  row: ChurchRecord | null;
  onSaved: () => void;
};

export function ChurchLeadershipModal({
  open,
  onClose,
  churchId,
  churchType,
  churchName,
  token,
  row,
  onSaved,
}: ChurchLeadershipModalProps) {
  const isMainChurch = churchType === 'MAIN';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[1px]">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="church-leadership-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              Church leadership
            </p>
            <h2 id="church-leadership-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {churchName}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {isMainChurch
                ? 'Leaders are chosen from all active congregation members in the system.'
                : 'Assign leaders from members of this congregation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ChurchLeadershipEditor
            churchId={churchId}
            churchType={churchType}
            churchName={churchName}
            token={token}
            row={row}
            showHeader={false}
            onSaved={() => {
              onSaved();
              onClose();
            }}
          />
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-950/50">
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={fieldBtn}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

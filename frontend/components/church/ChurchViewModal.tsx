'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ChurchRecord } from '@/app/dashboard/superadmin/churches/types';

type Props = {
  open: boolean;
  onClose: () => void;
  church: ChurchRecord | null;
  localMinister: string;
};

function conferenceLabel(row: ChurchRecord) {
  if (!row.conference || typeof row.conference === 'string') return '—';
  return row.conference.name || row.conference.conferenceId || '—';
}

function mainChurchLabel(row: ChurchRecord) {
  if (!row.mainChurch || typeof row.mainChurch === 'string') return '—';
  return row.mainChurch.name || '—';
}

function formatAddress(c: ChurchRecord) {
  const parts = [c.address, c.city, c.stateOrProvince, c.postalCode, c.country].filter(
    (p) => p && String(p).trim()
  ) as string[];
  return parts.length ? parts.join(', ') : '—';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-b border-neutral-100 py-2.5 sm:grid-cols-[minmax(0,9rem)_1fr] sm:items-start sm:gap-3 last:border-0">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="break-words text-sm text-neutral-900">{value || '—'}</dd>
    </div>
  );
}

export function ChurchViewModal({ open, onClose, church, localMinister }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !church) return null;

  const c = church;
  const coords =
    c.latitude != null && c.longitude != null
      ? `${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}`
      : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="church-view-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,100dvh-2rem)] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Church</p>
            <h2 id="church-view-title" className="text-lg font-semibold text-neutral-900">
              {c.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-3">
          <dl>
            <Row label="Type" value={c.churchType === 'SUB' ? 'Sub church' : 'Main church'} />
            <Row label="Status" value={c.isActive === false ? 'Inactive' : 'Active'} />
            <Row label="Local Minister" value={localMinister} />
            <Row label="Conference" value={conferenceLabel(c)} />
            <Row label="Main church" value={c.churchType === 'SUB' ? mainChurchLabel(c) : '—'} />
            <Row
              label="Location"
              value={[c.city, c.country].filter(Boolean).join(', ') || '—'}
            />
            <Row label="Address" value={formatAddress(c)} />
            <Row label="Phone" value={c.phone || '—'} />
            <Row label="Email" value={c.email || '—'} />
            <Row label="Coordinates" value={coords} />
          </dl>
        </div>
        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

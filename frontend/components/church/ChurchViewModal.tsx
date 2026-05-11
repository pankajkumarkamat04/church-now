'use client';

import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { ChurchMemberRef, ChurchRecord, LocalLeadership } from '@/app/dashboard/superadmin/churches/types';

type Props = {
  open: boolean;
  onClose: () => void;
  church: ChurchRecord | null;
  localMinister: string;
};

/** Labels aligned with ChurchLeadershipModal single-role fields. */
const VIEW_ROLE_LABELS: Record<string, string> = {
  spiritualPastor: 'Spiritual pastor',
  churchPresident: 'Church president (minister)',
  vicePresident: 'Vice president (minister)',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  superintendent: 'Superintendent (minister)',
  viceSuperintendent: 'Vice superintendent (minister)',
  conferenceMinister1: 'Conference minister 1',
  conferenceMinister2: 'Conference minister 2',
  minister: 'Minister',
  deacon: 'Deacon (elected)',
  viceDeacon: 'Vice deacon',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
};

const MAIN_LEADERSHIP_VIEW_KEYS: (keyof LocalLeadership)[] = [
  'spiritualPastor',
  'churchPresident',
  'vicePresident',
  'moderator',
  'viceModerator',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
  'minister',
  'superintendent',
  'viceSuperintendent',
  'conferenceMinister1',
  'conferenceMinister2',
];

const SUB_LEADERSHIP_VIEW_KEYS: (keyof LocalLeadership)[] = [
  'deacon',
  'viceDeacon',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
];

function memberDisplayName(ref: ChurchMemberRef | string | null | undefined): string {
  if (ref == null || ref === '') return '—';
  if (typeof ref === 'string') {
    const s = ref.trim();
    return s || '—';
  }
  const n =
    (ref.fullName && String(ref.fullName).trim()) ||
    [ref.firstName, ref.surname].filter(Boolean).join(' ').trim() ||
    (ref.email && String(ref.email).trim());
  return n || '—';
}

function committeeMembersLine(l: LocalLeadership | undefined): string {
  const arr = l?.committeeMembers;
  if (!Array.isArray(arr) || arr.length === 0) return '—';
  const names = arr.map((r) => memberDisplayName(r)).filter((x) => x !== '—');
  return names.length ? names.join(', ') : '—';
}

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

  const leadershipKeys = useMemo(() => {
    if (!church) return [];
    return church.churchType === 'SUB' ? SUB_LEADERSHIP_VIEW_KEYS : MAIN_LEADERSHIP_VIEW_KEYS;
  }, [church]);

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
      <div className="flex max-h-[min(90vh,100dvh-2rem)] w-full min-w-0 max-w-xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
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

          <div className="mt-4 border-t border-neutral-200 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">Local leadership</p>
            <dl>
              {leadershipKeys.map((key) => {
                const raw = c.localLeadership?.[key];
                const value =
                  raw === undefined || raw === null || (typeof raw === 'string' && !String(raw).trim())
                    ? '—'
                    : memberDisplayName(raw as ChurchMemberRef | string);
                const label = VIEW_ROLE_LABELS[String(key)] || String(key);
                return <Row key={String(key)} label={label} value={value} />;
              })}
              <Row label="Committee members (elected)" value={committeeMembersLine(c.localLeadership)} />
            </dl>
          </div>
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

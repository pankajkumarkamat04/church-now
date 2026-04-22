import type { ChurchRecord, ChurchMemberRef } from '@/app/dashboard/superadmin/churches/types';

function nameFromRef(
  ref: ChurchMemberRef | string | null | undefined
): string {
  if (!ref) return '—';
  if (typeof ref === 'string') return '—';
  return (
    (ref.fullName && String(ref.fullName).trim()) ||
    [ref.firstName, ref.surname].filter(Boolean).join(' ').trim() ||
    (ref.email && String(ref.email).trim()) ||
    '—'
  );
}

/** Pastor / spiritual leader: spiritual pastor, else minister, else empty (list API may backfill from pastor term). */
export function localMinisterFromChurch(row: ChurchRecord | null | undefined): string {
  if (!row?.localLeadership) return '—';
  const { spiritualPastor, minister } = row.localLeadership;
  const fromSpiritual = nameFromRef(spiritualPastor);
  if (fromSpiritual !== '—') return fromSpiritual;
  const fromMinister = nameFromRef(minister);
  if (fromMinister !== '—') return fromMinister;
  return '—';
}

/**
 * For church list / datatable: prefix the minister name with "Rev" unless it
 * already starts with an honorific (Rev, Reverend, etc.).
 */
export function withRevMinisterPrefix(displayName: string): string {
  if (!displayName || displayName === '—') return '—';
  const t = displayName.trim();
  if (/^(rev\.?|reverend|pastor|dr\.?|bishop)\b/i.test(t)) return t;
  return `Rev ${t}`;
}

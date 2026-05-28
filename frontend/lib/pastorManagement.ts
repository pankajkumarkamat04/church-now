export type ChurchRef = {
  _id: string;
  name: string;
  churchType?: 'MAIN' | 'SUB' | string;
};

export function isMainChurch(c: { churchType?: string } | null | undefined): boolean {
  return c?.churchType === 'MAIN';
}

/** Sub-church congregations only (excludes denomination main church). */
export function subChurchesOnly<T extends { churchType?: string }>(churches: T[]): T[] {
  return churches.filter((c) => !isMainChurch(c));
}

export function churchIdFromTermChurch(
  church?: { _id?: string } | string | null
): string {
  if (!church) return '';
  if (typeof church === 'string') return church;
  return String(church._id || '');
}

export function isMainChurchRecord(
  row: { church?: { _id?: string; churchType?: string } | string | null },
  mainChurchId: string
): boolean {
  const cid = churchIdFromTermChurch(row.church);
  if (mainChurchId && cid === mainChurchId) return true;
  if (typeof row.church === 'object' && row.church?.churchType === 'MAIN') return true;
  return false;
}

export function excludeMainChurchRows<T extends { church?: { _id?: string; churchType?: string } | string | null }>(
  rows: T[],
  mainChurchId: string
): T[] {
  return rows.filter((r) => !isMainChurchRecord(r, mainChurchId));
}

/** Readable amber badge (main church spiritual leader). See globals.css `.badge-pastor-main-leader`. */
export const pastorMainLeaderBadgeClass = 'badge-pastor-main-leader';

export const pastorLocalBadgeClass = 'badge-pastor-local';

export const pastorPoolBadgeClass = 'badge-pastor-pool';

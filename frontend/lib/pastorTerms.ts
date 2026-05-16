export const PASTOR_TERM_LENGTH_OPTIONS = [
  { value: 1 as const, label: '1 year' },
  { value: 4 as const, label: '4 years' },
] as const;

export type PastorTermLengthYears = (typeof PASTOR_TERM_LENGTH_OPTIONS)[number]['value'];

export const MAX_PASTOR_TERM_CYCLES = 2;

export function normalizePastorTermLengthYears(value: unknown): PastorTermLengthYears {
  const n = Number(value);
  return n === 1 ? 1 : 4;
}

export function maxPastorTermTotalYears(termLengthYears: PastorTermLengthYears): number {
  return termLengthYears * MAX_PASTOR_TERM_CYCLES;
}

export function pastorTermLengthLabel(termLengthYears: unknown): string {
  if (termLengthYears === 1 || termLengthYears === 4) {
    return termLengthYears === 1 ? '1 year' : '4 years';
  }
  if (termLengthYears == null || termLengthYears === '') {
    return '4 years (default)';
  }
  const years = normalizePastorTermLengthYears(termLengthYears);
  return years === 1 ? '1 year' : '4 years';
}

export function pastorTermCycleLabel(termNumber: number, termLengthYears: unknown): string {
  const len = normalizePastorTermLengthYears(termLengthYears);
  return `Term ${termNumber}/${MAX_PASTOR_TERM_CYCLES} · ${len === 1 ? '1-year' : '4-year'}`;
}

export function pastorTermRenewalHint(termLengthYears: PastorTermLengthYears): string {
  const total = maxPastorTermTotalYears(termLengthYears);
  const label = termLengthYears === 1 ? '1-year' : '4-year';
  return `Each assignment is a ${label} term. One renewal is allowed (max ${total} year${total === 1 ? '' : 's'} total).`;
}

export const PAYMENT_OPTIONS = [
  'TITHE',
  'BUILDING',
  'ROOF',
  'GAZALAND',
  'UTC',
  'THANKS',
  'MUSIC',
  'XMAS',
  'HARVEST',
] as const;

export type PaymentOption = (typeof PAYMENT_OPTIONS)[number];

/** Display labels for finance reports and forms (matches unified offering lines). */
export const PAYMENT_OPTION_LABELS: Record<PaymentOption, string> = {
  TITHE: 'Tithe',
  BUILDING: 'Building',
  ROOF: 'Roof',
  GAZALAND: 'Gazaland',
  UTC: 'UTC',
  THANKS: 'Thanks',
  MUSIC: 'Music',
  XMAS: 'Xmas',
  HARVEST: 'Harvest',
};

/** USD amounts per payment line type (from stored paymentLines). */
export function amountsByPaymentOption(
  lines: Array<{ paymentType: string; amount: number }> | undefined | null,
  codes: string[] = [...PAYMENT_OPTIONS]
): Record<string, number> {
  const known = new Set(codes.map((c) => c.toUpperCase()));
  const out: Record<string, number> = Object.fromEntries(codes.map((k) => [k, 0]));
  if (!lines?.length) return out;
  for (const line of lines) {
    const key = String(line.paymentType || '').trim().toUpperCase();
    if (!key) continue;
    if (!known.has(key)) out[key] = 0;
    out[key] = (out[key] || 0) + (Number(line.amount) || 0);
  }
  return out;
}

export function labelForPaymentType(code: string, labels: Record<string, string>): string {
  const key = String(code || '').trim().toUpperCase();
  return labels[key] || PAYMENT_OPTION_LABELS[key as PaymentOption] || key;
}

/** Column codes for history/reports: defaults plus any types present in payment lines. */
export function paymentColumnCodesFromLines(
  rows: Array<{ paymentLines?: Array<{ paymentType?: string }> | null }>,
  defaults: readonly string[] = PAYMENT_OPTIONS
): string[] {
  const set = new Set<string>(defaults);
  for (const r of rows) {
    for (const line of r.paymentLines || []) {
      const code = String(line.paymentType || '').trim().toUpperCase();
      if (code) set.add(code);
    }
  }
  return [...set];
}

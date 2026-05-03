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

/** USD amounts per payment line type (from stored paymentLines). */
export function amountsByPaymentOption(
  lines: Array<{ paymentType: string; amount: number }> | undefined | null
): Record<PaymentOption, number> {
  const out = Object.fromEntries(PAYMENT_OPTIONS.map((k) => [k, 0])) as Record<PaymentOption, number>;
  if (!lines?.length) return out;
  for (const line of lines) {
    const key = String(line.paymentType || '').trim().toUpperCase();
    if (key && key in out) {
      out[key as PaymentOption] += Number(line.amount) || 0;
    }
  }
  return out;
}

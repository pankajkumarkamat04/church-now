import { apiFetch } from '@/lib/api';

export type DisplayCurrency = 'USD' | 'ZAR' | 'ZWG';

export type PublicCurrencyRates = {
  foreignPerUsd: { ZAR: number; ZWG: number };
  fetchedAt: string;
  source: string;
  usdPerUnit: { USD: number; ZAR: number; ZWG: number };
};

export const DISPLAY_CURRENCY_OPTIONS: { value: DisplayCurrency; label: string }[] = [
  { value: 'USD', label: 'USD — US dollar' },
  { value: 'ZAR', label: 'ZAR — South African rand' },
  { value: 'ZWG', label: 'ZWG — Zimbabwe Gold (ZiG)' },
];

export function normalizeDisplayCurrencyInput(raw: string): DisplayCurrency {
  const u = String(raw || 'USD')
    .trim()
    .toUpperCase();
  if (u === 'ZIG' || u === 'ZWL') return 'ZWG';
  if (u === 'ZAR' || u === 'ZWG') return u;
  return 'USD';
}

export async function fetchPublicCurrencyRates(): Promise<PublicCurrencyRates> {
  return apiFetch<PublicCurrencyRates>('/api/public/currency/rates');
}

/** Amounts in DB are USD; multiply by foreign-per-USD to show in ZAR/ZWG. */
export function usdToDisplayAmount(
  usd: number,
  display: DisplayCurrency,
  foreignPerUsd: { ZAR: number; ZWG: number }
): number {
  if (!Number.isFinite(usd)) return 0;
  if (display === 'USD') return usd;
  const mult = foreignPerUsd[display];
  if (!mult || !Number.isFinite(mult)) return usd;
  return usd * mult;
}

/** Convert an amount entered in the selected display currency to USD. */
export function displayAmountToUsd(
  amount: number,
  display: DisplayCurrency,
  foreignPerUsd: { ZAR: number; ZWG: number }
): number {
  if (!Number.isFinite(amount)) return 0;
  if (display === 'USD') return amount;
  const mult = foreignPerUsd[display];
  if (!mult || !Number.isFinite(mult)) return amount;
  return amount / mult;
}

export function formatDisplayMoney(display: DisplayCurrency, value: number): string {
  const sym = display === 'USD' ? 'USD' : display;
  return `${sym} ${value.toFixed(2)}`;
}

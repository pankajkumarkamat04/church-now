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

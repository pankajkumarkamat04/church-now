/** Official Zimbabwe provinces (including metropolitan provinces). */
export const ZIMBABWE_PROVINCES = [
  'Bulawayo',
  'Harare',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
] as const;

export const OTHER_PROVINCE_VALUE = '__OTHER__';

export type ZimbabweProvince = (typeof ZIMBABWE_PROVINCES)[number];

export function isKnownZimbabweProvince(value: string): boolean {
  return (ZIMBABWE_PROVINCES as readonly string[]).includes(value);
}

/** Matches backend `passwordPolicy.js` — keep in sync when rules change. */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_SUMMARY =
  'At least 8 characters, including uppercase and lowercase letters, a number, and a special character.';

const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

/** @returns Error message or null if valid */
export function validatePassword(password: string): string | null {
  const p = String(password ?? '');
  if (p.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!HAS_LOWER.test(p)) {
    return 'Password must include at least one lowercase letter';
  }
  if (!HAS_UPPER.test(p)) {
    return 'Password must include at least one uppercase letter';
  }
  if (!HAS_DIGIT.test(p)) {
    return 'Password must include at least one number';
  }
  if (!HAS_SPECIAL.test(p)) {
    return 'Password must include at least one special character (e.g. ! @ # $ % & *)';
  }
  return null;
}

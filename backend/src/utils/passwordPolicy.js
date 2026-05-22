/**
 * Church system password policy (data protection / access control).
 * Enforced on register, reset, change-password, and admin-set passwords.
 */

const MIN_LENGTH = 8;
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

const PASSWORD_REQUIREMENTS_SUMMARY =
  'At least 8 characters, including uppercase and lowercase letters, a number, and a special character.';

/**
 * @param {unknown} password
 * @returns {string|null} Error message or null if valid
 */
function validatePassword(password) {
  if (password === undefined || password === null) {
    return 'Password is required';
  }
  const p = String(password);
  if (p.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters`;
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

/** Alias used by password reset / change flows */
function validateNewPassword(password) {
  return validatePassword(password);
}

module.exports = {
  MIN_LENGTH,
  PASSWORD_REQUIREMENTS_SUMMARY,
  validatePassword,
  validateNewPassword,
};

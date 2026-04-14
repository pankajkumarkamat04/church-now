const { GENDERS } = require('../models/User');

/**
 * Safe JSON shape for member / profile responses (no secrets).
 */
function toProfileResponse(userDoc) {
  const u = userDoc.toObject ? userDoc.toObject({ virtuals: true }) : { ...userDoc };
  delete u.password;
  delete u.passwordResetToken;
  delete u.passwordResetExpires;

  return {
    id: u._id,
    email: u.email,
    fullName: u.fullName || '',
    gender: u.gender ?? null,
    dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null,
    address: u.address
      ? {
          line1: u.address.line1 || '',
          line2: u.address.line2 || '',
          city: u.address.city || '',
          stateOrProvince: u.address.stateOrProvince || '',
          postalCode: u.address.postalCode || '',
          country: u.address.country || '',
        }
      : {
          line1: '',
          line2: '',
          city: '',
          stateOrProvince: '',
          postalCode: '',
          country: '',
        },
    role: u.role,
    church: u.church ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function parseDateOfBirth(value) {
  if (value === null || value === '' || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  if (d > now) return undefined;
  const min = new Date('1900-01-01T00:00:00.000Z');
  if (d < min) return undefined;
  return d;
}

function mergeAddress(existing, patch) {
  if (!patch || typeof patch !== 'object') return existing;
  const keys = ['line1', 'line2', 'city', 'stateOrProvince', 'postalCode', 'country'];
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  for (const k of keys) {
    if (patch[k] !== undefined) base[k] = String(patch[k] ?? '').trim();
  }
  return base;
}

/**
 * Apply allowed profile fields from body onto user document.
 * Returns { error: string } on validation failure, or {} on success.
 */
function applyMemberProfilePatch(user, body, options = {}) {
  const { allowAdminFields = false } = options;

  if (body.fullName !== undefined) {
    user.fullName = String(body.fullName ?? '').trim();
  }

  if (body.gender !== undefined) {
    if (body.gender === null || body.gender === '') {
      user.gender = undefined;
    } else if (GENDERS.includes(body.gender)) {
      user.gender = body.gender;
    } else {
      return { error: `gender must be one of: ${GENDERS.join(', ')}` };
    }
  }

  if (body.dateOfBirth !== undefined) {
    const d = parseDateOfBirth(body.dateOfBirth);
    if (d === undefined && body.dateOfBirth !== null && body.dateOfBirth !== '') {
      return { error: 'Invalid date of birth (use ISO date, not in the future)' };
    }
    user.dateOfBirth = d;
  }

  if (body.address !== undefined) {
    const current = user.address?.toObject?.() || user.address || {};
    user.address = mergeAddress(current, body.address);
  }

  if (allowAdminFields && body.isActive !== undefined) {
    user.isActive = Boolean(body.isActive);
  }

  return {};
}

module.exports = {
  toProfileResponse,
  applyMemberProfilePatch,
  parseDateOfBirth,
  mergeAddress,
};

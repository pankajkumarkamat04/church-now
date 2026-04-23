const { GENDERS, MEMBER_CATEGORIES } = require('../models/User');
const GlobalCouncil = require('../models/GlobalCouncil');
const { collectCongregationRoleLabelsForUser } = require('./churchMemberRoles');

/**
 * Safe JSON shape for member / profile responses (no secrets).
 */
function toProfileResponse(userDoc) {
  const u = userDoc.toObject ? userDoc.toObject({ virtuals: true }) : { ...userDoc };
  delete u.password;
  delete u.passwordResetToken;
  delete u.passwordResetExpires;

  const ch = u.church && typeof u.church === 'object' ? u.church : null;
  const memberRolesFromChurch = ch && u._id ? collectCongregationRoleLabelsForUser(ch, u._id) : [];
  const memberRoleDisplay =
    String(u.memberRoleDisplay || '').trim() ||
    (memberRolesFromChurch.length > 0 ? memberRolesFromChurch.join(', ') : u.memberCategory || 'MEMBER');

  const canAccessMemberPortal =
    u.role === 'MEMBER' ||
    (u.role === 'ADMIN' && u.church && String(u.memberId || '').trim() !== '');

  const confList = Array.isArray(u.conferences) ? u.conferences : [];
  const conference = confList[0] && typeof confList[0] === 'object' ? confList[0] : null;
  const dob = u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null;
  const mship = u.membershipDate ? u.membershipDate.toISOString().slice(0, 10) : null;
  const bap = u.baptismDate ? u.baptismDate.toISOString().slice(0, 10) : null;

  return {
    id: u._id,
    /** System user id (Mongo) */
    email: u.email,
    firstName: u.firstName || '',
    surname: u.surname || '',
    fullName: u.fullName || '',
    /** Display / legal name (same as fullName) */
    name: u.fullName || '',
    idNumber: u.idNumber || '',
    contactPhone: u.contactPhone || '',
    /** Same as `email` (account / primary contact) */
    contact_email: u.email,
    contact_phone: u.contactPhone || '',
    gender: u.gender ?? null,
    dateOfBirth: dob,
    date_of_birth: dob,
    membershipDate: mship,
    membership_date: mship,
    baptismDate: bap,
    baptism_date: bap,
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
    conferences: confList,
    /** Primary / first conference for this member (if any) */
    conference: conference,
    councilIds: Array.isArray(u.councilIds) ? u.councilIds.map((id) => String(id)) : [],
    /** Resolved global councils (name per council id) — set by `attachCouncilNamesToProfiles` */
    councils: [],
    memberCategory: u.memberCategory || 'MEMBER',
    memberRolesFromChurch,
    memberRoleDisplay,
    /** Congregation-unique member number (not the system user id) */
    memberId: u.memberId || '',
    canAccessMemberPortal,
    adminChurches: Array.isArray(u.adminChurches) ? u.adminChurches : [],
    isActive: u.isActive,
    approvalStatus: u.approvalStatus || 'APPROVED',
    registrationSource: u.registrationSource || 'SYSTEM',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function parseDateOfBirth(value) {
  if (value === null || value === '' || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  const futureLimit = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // allow +2 days for tz
  if (d > futureLimit) return undefined;
  const min = new Date('1900-01-01T00:00:00.000Z');
  if (d < min) return undefined;
  return d;
}

/** Membership / baptism: not in the future, after 1800. */
function parseChurchRecordDate(value) {
  if (value === null || value === '' || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  const futureLimit = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // allow +2 days for tz
  if (d > futureLimit) return undefined;
  const min = new Date('1800-01-01T00:00:00.000Z');
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

  if (body.firstName !== undefined) {
    user.firstName = String(body.firstName ?? '').trim();
  }
  if (body.surname !== undefined) {
    user.surname = String(body.surname ?? '').trim();
  }
  if (body.fullName !== undefined) {
    user.fullName = String(body.fullName ?? '').trim();
  }
  if (body.idNumber !== undefined) {
    user.idNumber = String(body.idNumber ?? '').trim();
  }
  if (body.contactPhone !== undefined) {
    user.contactPhone = String(body.contactPhone ?? '').trim();
  }
  if (body.memberCategory !== undefined) {
    const v = String(body.memberCategory || '').toUpperCase();
    if (!MEMBER_CATEGORIES.includes(v)) {
      return { error: `memberCategory must be one of: ${MEMBER_CATEGORIES.join(', ')}` };
    }
    user.memberCategory = v;
  }
  if (body.conferenceIds !== undefined) {
    user.conferences = Array.isArray(body.conferenceIds) ? body.conferenceIds : [];
  }
  if (body.councilIds !== undefined) {
    user.councilIds = Array.isArray(body.councilIds) ? body.councilIds : [];
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

  const mshipIn = body.membershipDate !== undefined ? body.membershipDate : body.membership_date;
  if (mshipIn !== undefined) {
    const d = parseChurchRecordDate(mshipIn);
    if (d === undefined && mshipIn !== null && mshipIn !== '') {
      return { error: 'Invalid membership date' };
    }
    user.membershipDate = d;
  }
  const bapIn = body.baptismDate !== undefined ? body.baptismDate : body.baptism_date;
  if (bapIn !== undefined) {
    const d = parseChurchRecordDate(bapIn);
    if (d === undefined && bapIn !== null && bapIn !== '') {
      return { error: 'Invalid baptism date' };
    }
    user.baptismDate = d;
  }

  if (body.address !== undefined) {
    const current = user.address?.toObject?.() || user.address || {};
    user.address = mergeAddress(current, body.address);
  }

  if (allowAdminFields && body.isActive !== undefined) {
    user.isActive = Boolean(body.isActive);
  }

  if (body.fullName === undefined) {
    const auto = [String(user.firstName || '').trim(), String(user.surname || '').trim()]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (auto) user.fullName = auto;
  }

  return {};
}

/**
 * Fills `councils: [{ _id, name }]` from `councilIds` (global council documents).
 */
async function attachCouncilNamesToProfile(profile) {
  const ids = Array.isArray(profile.councilIds) ? profile.councilIds.map(String) : [];
  if (ids.length === 0) {
    return { ...profile, councils: [] };
  }
  const rows = await GlobalCouncil.find({ _id: { $in: ids } }).select('_id name').lean();
  const nameBy = new Map(rows.map((r) => [String(r._id), r.name || '—']));
  return {
    ...profile,
    councils: ids.map((id) => ({ _id: id, name: nameBy.get(String(id)) || '—' })),
  };
}

/** Batch version for list endpoints. */
async function attachCouncilNamesToProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) return [];
  const all = new Set();
  for (const p of profiles) {
    (p.councilIds || []).forEach((id) => all.add(String(id)));
  }
  if (all.size === 0) {
    return profiles.map((p) => ({ ...p, councils: [] }));
  }
  const rows = await GlobalCouncil.find({ _id: { $in: [...all] } }).select('_id name').lean();
  const nameBy = new Map(rows.map((r) => [String(r._id), r.name || '—']));
  return profiles.map((p) => ({
    ...p,
    councils: (p.councilIds || []).map((id) => ({ _id: id, name: nameBy.get(String(id)) || '—' })),
  }));
}

module.exports = {
  toProfileResponse,
  applyMemberProfilePatch,
  parseDateOfBirth,
  parseChurchRecordDate,
  mergeAddress,
  attachCouncilNamesToProfile,
  attachCouncilNamesToProfiles,
};

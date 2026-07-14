const { GENDERS, MEMBER_CATEGORIES, MEMBER_BADGE_TYPES } = require('../models/User');

function normalizeMemberBadgeType(raw) {
  const v = String(raw ?? 'NON_BADGED')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  if (v === 'BADGED') return 'BADGED';
  if (v === 'NON_BADGED' || v === 'NONBADGED') return 'NON_BADGED';
  return 'NON_BADGED';
}
const GlobalCouncil = require('../models/GlobalCouncil');
const { collectCongregationRoleLabelsForUser } = require('./churchMemberRoles');
const { isTreasurerOrViceTreasurer } = require('./treasurerAccess');

function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function serializeCouncilBadges(list) {
  if (!Array.isArray(list)) return [];
  return list.map((row) => ({
    councilId: row.councilId != null ? String(row.councilId) : '',
    badgedVolunteerDate: toDateOnly(row.badgedVolunteerDate),
    badgedRuwadzanoDate: toDateOnly(row.badgedRuwadzanoDate),
  }));
}

function serializePositionsHeld(list) {
  if (!Array.isArray(list)) return [];
  return list.map((row) => ({
    _id: row._id != null ? String(row._id) : undefined,
    title: row.title || '',
    organization: row.organization || '',
    fromDate: toDateOnly(row.fromDate),
    toDate: toDateOnly(row.toDate),
    notes: row.notes || '',
  }));
}

/**
 * Safe JSON shape for member / profile responses (no secrets).
 */
function toProfileResponse(userDoc) {
  const u = userDoc.toObject ? userDoc.toObject({ virtuals: true }) : { ...userDoc };
  delete u.password;
  delete u.passwordResetToken;
  delete u.passwordResetExpires;

  const ch = u.church && typeof u.church === 'object' ? u.church : null;
  const ll =
    ch && ch.localLeadership && typeof ch.localLeadership === 'object' ? ch.localLeadership : {};
  const committeeRaw = Array.isArray(ll.committeeMembers) ? ll.committeeMembers : [];
  const isChurchCommitteeMember =
    u._id != null && committeeRaw.some((cid) => String(cid) === String(u._id));
  const memberRolesFromChurch = ch && u._id ? collectCongregationRoleLabelsForUser(ch, u._id) : [];
  const memberRoleDisplay =
    String(u.memberRoleDisplay || '').trim() ||
    (memberRolesFromChurch.length > 0 ? memberRolesFromChurch.join(', ') : u.memberCategory || 'MEMBER');

  let canManageTreasury = false;
  if (u._id) {
    if (ch && isTreasurerOrViceTreasurer(ch, u._id)) canManageTreasury = true;
    if (!canManageTreasury && Array.isArray(u.adminChurches)) {
      for (const ac of u.adminChurches) {
        if (ac && typeof ac === 'object' && isTreasurerOrViceTreasurer(ac, u._id)) {
          canManageTreasury = true;
          break;
        }
      }
    }
  }

  const canAccessMemberPortal =
    u.role === 'MEMBER' ||
    (u.role === 'ADMIN' && u.church && String(u.memberId || '').trim() !== '');

  const confList = Array.isArray(u.conferences) ? u.conferences : [];
  const conference = confList[0] && typeof confList[0] === 'object' ? confList[0] : null;
  const dob = toDateOnly(u.dateOfBirth);
  const mship = toDateOnly(u.membershipDate);
  const bap = toDateOnly(u.baptismDate);

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
    isFullMember: Boolean(u.isFullMember),
    membershipDate: mship,
    membership_date: mship,
    admittedBy: u.admittedBy || '',
    baptismDate: bap,
    baptism_date: bap,
    baptismBy: u.baptismBy || '',
    baptismPlace: u.baptismPlace || '',
    councilBadges: serializeCouncilBadges(u.councilBadges),
    positionsHeld: serializePositionsHeld(u.positionsHeld),
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
    memberBadgeType: u.memberBadgeType || 'NON_BADGED',
    memberRolesFromChurch,
    /** Listed on church leadership committee (badge-only; no auto admin). */
    isChurchCommitteeMember,
    memberRoleDisplay,
    /** Assigned as church treasurer or vice treasurer in local leadership. */
    canManageTreasury,
    /** Congregation-unique member number (not the system user id) */
    memberId: u.memberId || '',
    canAccessMemberPortal,
    adminChurches: Array.isArray(u.adminChurches) ? u.adminChurches : [],
    isActive: u.isActive,
    approvalStatus: u.approvalStatus || 'APPROVED',
    registrationSource: u.registrationSource || 'SYSTEM',
    walletBalance: Number(u.walletBalance || 0),
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

function normalizeCouncilBadges(input) {
  if (!Array.isArray(input)) return { error: 'councilBadges must be an array' };
  const out = [];
  const seen = new Set();
  for (const row of input) {
    if (!row || typeof row !== 'object') continue;
    const councilId = String(row.councilId || '').trim();
    if (!councilId) continue;
    if (seen.has(councilId)) continue;
    seen.add(councilId);
    const volRaw = row.badgedVolunteerDate;
    const ruwRaw = row.badgedRuwadzanoDate;
    let badgedVolunteerDate = null;
    let badgedRuwadzanoDate = null;
    if (volRaw !== undefined && volRaw !== null && volRaw !== '') {
      badgedVolunteerDate = parseChurchRecordDate(volRaw);
      if (badgedVolunteerDate === undefined) {
        return { error: 'Invalid badged Volunteer date' };
      }
    }
    if (ruwRaw !== undefined && ruwRaw !== null && ruwRaw !== '') {
      badgedRuwadzanoDate = parseChurchRecordDate(ruwRaw);
      if (badgedRuwadzanoDate === undefined) {
        return { error: 'Invalid badged Ruwadzano date' };
      }
    }
    out.push({ councilId, badgedVolunteerDate, badgedRuwadzanoDate });
  }
  return { value: out };
}

function normalizePositionsHeld(input) {
  if (!Array.isArray(input)) return { error: 'positionsHeld must be an array' };
  const out = [];
  for (const row of input) {
    if (!row || typeof row !== 'object') continue;
    const title = String(row.title || '').trim();
    if (!title) continue;
    let fromDate = null;
    let toDate = null;
    if (row.fromDate !== undefined && row.fromDate !== null && row.fromDate !== '') {
      fromDate = parseChurchRecordDate(row.fromDate);
      if (fromDate === undefined) return { error: 'Invalid position start date' };
    }
    if (row.toDate !== undefined && row.toDate !== null && row.toDate !== '') {
      toDate = parseChurchRecordDate(row.toDate);
      if (toDate === undefined) return { error: 'Invalid position end date' };
    }
    out.push({
      title,
      organization: String(row.organization || '').trim(),
      fromDate,
      toDate,
      notes: String(row.notes || '').trim(),
    });
  }
  return { value: out };
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
  if (body.memberBadgeType !== undefined && allowAdminFields) {
    const b = normalizeMemberBadgeType(body.memberBadgeType);
    if (!MEMBER_BADGE_TYPES.includes(b)) {
      return { error: `memberBadgeType must be one of: ${MEMBER_BADGE_TYPES.join(', ')}` };
    }
    user.memberBadgeType = b;
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

  if (body.isFullMember !== undefined) {
    user.isFullMember = Boolean(body.isFullMember);
  }

  const mshipIn = body.membershipDate !== undefined ? body.membershipDate : body.membership_date;
  if (mshipIn !== undefined) {
    const d = parseChurchRecordDate(mshipIn);
    if (d === undefined && mshipIn !== null && mshipIn !== '') {
      return { error: 'Invalid membership date' };
    }
    user.membershipDate = d;
    if (d) user.isFullMember = true;
  }

  if (body.admittedBy !== undefined) {
    user.admittedBy = String(body.admittedBy ?? '').trim();
  }

  const bapIn = body.baptismDate !== undefined ? body.baptismDate : body.baptism_date;
  if (bapIn !== undefined) {
    const d = parseChurchRecordDate(bapIn);
    if (d === undefined && bapIn !== null && bapIn !== '') {
      return { error: 'Invalid baptism date' };
    }
    user.baptismDate = d;
  }

  if (body.baptismBy !== undefined) {
    user.baptismBy = String(body.baptismBy ?? '').trim();
  }
  if (body.baptismPlace !== undefined) {
    user.baptismPlace = String(body.baptismPlace ?? '').trim();
  }

  if (body.councilBadges !== undefined) {
    const normalized = normalizeCouncilBadges(body.councilBadges);
    if (normalized.error) return { error: normalized.error };
    user.councilBadges = normalized.value;
  }

  if (body.positionsHeld !== undefined) {
    const normalized = normalizePositionsHeld(body.positionsHeld);
    if (normalized.error) return { error: normalized.error };
    user.positionsHeld = normalized.value;
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
  const badgeCouncilIds = (profile.councilBadges || []).map((b) => String(b.councilId || '')).filter(Boolean);
  const allIds = [...new Set([...ids, ...badgeCouncilIds])];
  if (allIds.length === 0) {
    return { ...profile, councils: [], councilBadges: profile.councilBadges || [] };
  }
  const rows = await GlobalCouncil.find({ _id: { $in: allIds } }).select('_id name').lean();
  const nameBy = new Map(rows.map((r) => [String(r._id), r.name || '—']));
  return {
    ...profile,
    councils: ids.map((id) => ({ _id: id, name: nameBy.get(String(id)) || '—' })),
    councilBadges: (profile.councilBadges || []).map((b) => ({
      ...b,
      councilName: nameBy.get(String(b.councilId)) || '—',
    })),
  };
}

/** Batch version for list endpoints. */
async function attachCouncilNamesToProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) return [];
  const all = new Set();
  for (const p of profiles) {
    (p.councilIds || []).forEach((id) => all.add(String(id)));
    (p.councilBadges || []).forEach((b) => {
      if (b?.councilId) all.add(String(b.councilId));
    });
  }
  if (all.size === 0) {
    return profiles.map((p) => ({ ...p, councils: [], councilBadges: p.councilBadges || [] }));
  }
  const rows = await GlobalCouncil.find({ _id: { $in: [...all] } }).select('_id name').lean();
  const nameBy = new Map(rows.map((r) => [String(r._id), r.name || '—']));
  return profiles.map((p) => ({
    ...p,
    councils: (p.councilIds || []).map((id) => ({ _id: id, name: nameBy.get(String(id)) || '—' })),
    councilBadges: (p.councilBadges || []).map((b) => ({
      ...b,
      councilName: nameBy.get(String(b.councilId)) || '—',
    })),
  }));
}

module.exports = {
  toProfileResponse,
  normalizeMemberBadgeType,
  applyMemberProfilePatch,
  parseDateOfBirth,
  parseChurchRecordDate,
  mergeAddress,
  normalizeCouncilBadges,
  normalizePositionsHeld,
  attachCouncilNamesToProfile,
  attachCouncilNamesToProfiles,
};

const User = require('../models/User');
const PastorTerm = require('../models/PastorTerm');
const { ACTIVE_PASTOR_TERM_STATUSES } = require('./memberRoleSync');

const SINGLE_ROLE_KEYS = [
  'spiritualPastor',
  'deacon',
  'viceDeacon',
  'secretary',
  'viceSecretary',
  'treasurer',
];

function toIdOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim();
}

function normalizeLocalLeadership(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const key of SINGLE_ROLE_KEYS) {
    out[key] = toIdOrNull(src[key]);
  }
  const committee = Array.isArray(src.committeeMembers) ? src.committeeMembers : [];
  out.committeeMembers = [...new Set(committee.map((id) => toIdOrNull(id)).filter(Boolean))];
  return out;
}

function normalizeCouncils(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((c) => c && typeof c === 'object' && String(c.name || '').trim())
    .map((c) => {
      const name = String(c.name).trim();
      const roles = Array.isArray(c.roles)
        ? c.roles
            .filter((r) => r && typeof r === 'object')
            .map((r) => ({
              roleKey: String(r.roleKey || '').trim() || `role-${Math.random().toString(36).slice(2, 9)}`,
              roleLabel: String(r.roleLabel || r.roleKey || 'Role').trim(),
              member: toIdOrNull(r.member),
            }))
        : [];
      return { name, roles };
    });
}

function collectUserIdsFromLeadership(leadership) {
  const ids = [];
  for (const key of SINGLE_ROLE_KEYS) {
    if (leadership[key]) ids.push(leadership[key]);
  }
  ids.push(...(leadership.committeeMembers || []));
  return ids;
}

function collectUserIdsFromCouncils(councils) {
  const ids = [];
  for (const council of councils) {
    for (const role of council.roles || []) {
      if (role.member) ids.push(role.member);
    }
  }
  return ids;
}

async function assertUsersAreMembersOfChurch(churchId, userIds) {
  const unique = [...new Set(userIds.map(String))];
  if (unique.length === 0) return;
  const count = await User.countDocuments({
    _id: { $in: unique },
    church: churchId,
    role: 'MEMBER',
  });
  if (count !== unique.length) {
    const err = new Error('Leaders must be members of this congregation (role MEMBER at this church)');
    err.statusCode = 400;
    throw err;
  }
}

async function validateChurchLeadershipPayload(churchId, localLeadership, councils) {
  const leadership = normalizeLocalLeadership(localLeadership);
  const councilList = normalizeCouncils(councils);
  const allIds = [...collectUserIdsFromLeadership(leadership), ...collectUserIdsFromCouncils(councilList)];
  const counts = new Map();
  for (const id of allIds.map(String)) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const dupes = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  if (dupes.length > 0) {
    const err = new Error('A member can hold only one leadership role at a time');
    err.statusCode = 400;
    throw err;
  }
  await assertUsersAreMembersOfChurch(churchId, allIds);
  const activePastorTerms = await PastorTerm.find({
    church: churchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
    pastor: { $in: [...new Set(allIds.map(String))] },
  })
    .select('pastor')
    .lean();
  if (activePastorTerms.length > 0) {
    const err = new Error('Members assigned as spiritual leader/pastor cannot be assigned to other leadership roles');
    err.statusCode = 400;
    throw err;
  }
  return { leadership, councils: councilList };
}

const LEADERSHIP_MEMBER_SELECT = 'email fullName firstName surname';

const populateLeadershipPaths = [
  { path: 'localLeadership.spiritualPastor', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.deacon', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceDeacon', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.secretary', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceSecretary', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.treasurer', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.committeeMembers', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'councils.roles.member', select: LEADERSHIP_MEMBER_SELECT },
];

module.exports = {
  normalizeLocalLeadership,
  normalizeCouncils,
  validateChurchLeadershipPayload,
  populateLeadershipPaths,
  SINGLE_ROLE_KEYS,
};

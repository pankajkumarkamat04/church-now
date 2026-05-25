const User = require('../models/User');
const PastorTerm = require('../models/PastorTerm');
const { ACTIVE_PASTOR_TERM_STATUSES } = require('./memberRoleSync');

const SINGLE_ROLE_KEYS = [
  'spiritualPastor',
  'churchPresident',
  'vicePresident',
  'moderator',
  'viceModerator',
  'superintendent',
  'viceSuperintendent',
  'conferenceMinister1',
  'conferenceMinister2',
  'minister',
  'deacon',
  'viceDeacon',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
];
const PASTOR_ONLY_ROLE_KEYS = ['spiritualPastor', 'minister', 'conferenceMinister1', 'conferenceMinister2'];

/** Main church: ministers may be drawn from any congregation (PASTOR category). */
const MAIN_PASTOR_ONLY_ROLE_KEYS = [
  'spiritualPastor',
  'churchPresident',
  'vicePresident',
  'superintendent',
  'viceSuperintendent',
  'minister',
  'conferenceMinister1',
  'conferenceMinister2',
];

/** Main church: lay officers may be drawn from any congregation (non-pastor category). */
const MAIN_LAY_ROLE_KEYS = [
  'moderator',
  'viceModerator',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
];

const MAIN_PASTOR_ROLE_KEY_SET = new Set(MAIN_PASTOR_ONLY_ROLE_KEYS);
const MAIN_LAY_ROLE_KEY_SET = new Set(MAIN_LAY_ROLE_KEYS);

const LEADERSHIP_KEY_LABEL = {
  spiritualPastor: 'Spiritual pastor',
  churchPresident: 'Church president',
  vicePresident: 'Vice president',
  superintendent: 'Superintendent',
  viceSuperintendent: 'Vice superintendent',
  minister: 'Minister',
  conferenceMinister1: 'Conference minister (1)',
  conferenceMinister2: 'Conference minister (2)',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
};

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

/** Every distinct user id referenced as church leadership (single roles, committee, councils). */
function collectAllLeadershipUserIds(normalizedLeadership, normalizedCouncils) {
  const ids = [
    ...collectUserIdsFromLeadership(normalizedLeadership),
    ...collectUserIdsFromCouncils(normalizedCouncils || []),
  ];
  return [...new Set(ids.map(String))];
}

/** Single-role slots + councils only — committee members do not receive auto admin. */
function collectLeadershipUserIdsForAdminSync(normalizedLeadership, normalizedCouncils) {
  const ids = [];
  for (const key of SINGLE_ROLE_KEYS) {
    if (normalizedLeadership[key]) ids.push(normalizedLeadership[key]);
  }
  ids.push(...collectUserIdsFromCouncils(normalizedCouncils || []));
  return [...new Set(ids.map(String))];
}

async function assertUsersAreMembersOfChurch(churchId, userIds) {
  const unique = [...new Set(userIds.map(String))];
  if (unique.length === 0) return;
  const count = await User.countDocuments({
    _id: { $in: unique },
    role: { $in: ['MEMBER', 'ADMIN'] },
    isActive: true,
    $or: [{ church: churchId }, { adminChurches: churchId }],
  });
  if (count !== unique.length) {
    const err = new Error(
      'Leaders must belong to this congregation (MEMBER or ADMIN with access to this church)'
    );
    err.statusCode = 400;
    throw err;
  }
}

async function assertActiveMembersOrganizationWide(userIds) {
  const unique = [...new Set(userIds.map(String))];
  if (unique.length === 0) return;
  const count = await User.countDocuments({
    _id: { $in: unique },
    role: { $in: ['MEMBER', 'ADMIN'] },
    isActive: true,
  });
  if (count !== unique.length) {
    const err = new Error('Selected leaders must be active members or admins in the system');
    err.statusCode = 400;
    throw err;
  }
}

async function validateMainChurchLeadershipCategories(leadership, councilList) {
  const pastorRoleIds = MAIN_PASTOR_ONLY_ROLE_KEYS.map((k) => leadership[k]).filter(Boolean).map(String);
  const layRoleIds = [
    ...MAIN_LAY_ROLE_KEYS.map((k) => leadership[k]).filter(Boolean).map(String),
    ...(leadership.committeeMembers || []).map(String),
    ...collectUserIdsFromCouncils(councilList).map(String),
  ];
  const allIds = [...new Set([...pastorRoleIds, ...layRoleIds])];
  await assertActiveMembersOrganizationWide(allIds);

  if (pastorRoleIds.length > 0) {
    const pastorCount = await User.countDocuments({
      _id: { $in: pastorRoleIds },
      role: { $in: ['MEMBER', 'ADMIN'] },
      isActive: true,
      memberCategory: 'PASTOR',
    });
    if (pastorCount !== pastorRoleIds.length) {
      const err = new Error(
        'Minister roles (president, superintendent, conference ministers, etc.) must be pastors from any conference'
      );
      err.statusCode = 400;
      throw err;
    }
  }

  if (layRoleIds.length > 0) {
    const layCount = await User.countDocuments({
      _id: { $in: layRoleIds },
      role: { $in: ['MEMBER', 'ADMIN'] },
      isActive: true,
      memberCategory: { $ne: 'PASTOR' },
    });
    if (layCount !== layRoleIds.length) {
      const err = new Error(
        'Lay officers (moderator, secretary, treasurer, committee, councils) must be non-pastor members from any congregation'
      );
      err.statusCode = 400;
      throw err;
    }
  }

  for (const key of MAIN_PASTOR_ONLY_ROLE_KEYS) {
    const id = leadership[key];
    if (!id) continue;
    const u = await User.findById(id).select('memberCategory').lean();
    if (!u || String(u.memberCategory || '') !== 'PASTOR') {
      const err = new Error(
        `${LEADERSHIP_KEY_LABEL[key] || key} must be a pastor (member category PASTOR) from the global roster`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  for (const key of MAIN_LAY_ROLE_KEYS) {
    const id = leadership[key];
    if (!id) continue;
    const u = await User.findById(id).select('memberCategory').lean();
    if (!u || String(u.memberCategory || 'MEMBER') === 'PASTOR') {
      const err = new Error(
        `${LEADERSHIP_KEY_LABEL[key] || key} must be a lay member (not pastor category) from any congregation`
      );
      err.statusCode = 400;
      throw err;
    }
  }
}

async function validateChurchLeadershipPayload(churchId, localLeadership, councils, options = {}) {
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

  const churchType = String(options.churchType || '').toUpperCase() === 'MAIN' ? 'MAIN' : 'SUB';

  if (churchType === 'MAIN') {
    await validateMainChurchLeadershipCategories(leadership, councilList);
    return { leadership, councils: councilList };
  }

  await assertUsersAreMembersOfChurch(churchId, allIds);
  const uniqueIds = [...new Set(allIds.map(String))];
  const activePastorTerms = await PastorTerm.find({
    church: churchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
    pastor: { $in: uniqueIds },
  })
    .select('pastor')
    .lean();
  const pastorIdSet = new Set(activePastorTerms.map((t) => String(t.pastor)));

  const ministerRoleIds = PASTOR_ONLY_ROLE_KEYS.map((k) => leadership[k]).filter(Boolean).map(String);
  if (ministerRoleIds.some((id) => !pastorIdSet.has(id))) {
    const err = new Error('Minister roles can only be assigned to members who are Spiritual leader/Pastor');
    err.statusCode = 400;
    throw err;
  }

  const disallowedLeadershipIds = SINGLE_ROLE_KEYS
    .filter((k) => !PASTOR_ONLY_ROLE_KEYS.includes(k))
    .map((k) => leadership[k])
    .filter(Boolean)
    .map(String);
  const disallowedIds = [
    ...disallowedLeadershipIds,
    ...((leadership.committeeMembers || []).map(String)),
    ...collectUserIdsFromCouncils(councilList).map(String),
  ];
  if (disallowedIds.some((id) => pastorIdSet.has(id))) {
    const err = new Error('Members assigned as spiritual leader/pastor cannot be assigned to non-minister leadership roles');
    err.statusCode = 400;
    throw err;
  }
  return { leadership, councils: councilList };
}

const LEADERSHIP_MEMBER_SELECT = 'email fullName firstName surname memberId';

const populateLeadershipPaths = [
  { path: 'localLeadership.spiritualPastor', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.churchPresident', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.vicePresident', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.moderator', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceModerator', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.superintendent', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceSuperintendent', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.conferenceMinister1', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.conferenceMinister2', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.minister', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.deacon', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceDeacon', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.secretary', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceSecretary', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.treasurer', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.viceTreasurer', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'localLeadership.committeeMembers', select: LEADERSHIP_MEMBER_SELECT },
  { path: 'councils.roles.member', select: LEADERSHIP_MEMBER_SELECT },
];

module.exports = {
  normalizeLocalLeadership,
  normalizeCouncils,
  validateChurchLeadershipPayload,
  populateLeadershipPaths,
  SINGLE_ROLE_KEYS,
  MAIN_PASTOR_ONLY_ROLE_KEYS,
  MAIN_LAY_ROLE_KEYS,
  MAIN_PASTOR_ROLE_KEY_SET,
  MAIN_LAY_ROLE_KEY_SET,
  collectAllLeadershipUserIds,
  collectLeadershipUserIdsForAdminSync,
};

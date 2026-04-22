/**
 * Resolve human-readable congregation roles for a user from a church's
 * localLeadership and councils (same structure as Church schema).
 */

const LOCAL_SINGLE_ROLE_LABELS = {
  spiritualPastor: 'Spiritual Pastor',
  churchPresident: 'Church president',
  vicePresident: 'Vice president',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  superintendent: 'Superintendent',
  viceSuperintendent: 'Vice superintendent',
  conferenceMinister1: 'Conference minister',
  conferenceMinister2: 'Conference minister',
  minister: 'Minister',
  deacon: 'Deacon',
  viceDeacon: 'Vice Deacon',
  secretary: 'Secretary',
  viceSecretary: 'V/Secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
};

function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * @param {object|null|undefined} church — plain object or Mongoose doc with localLeadership, councils
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @returns {string[]}
 */
function collectCongregationRoleLabelsForUser(church, userId) {
  if (!church || !userId) return [];

  const ll =
    church.localLeadership && typeof church.localLeadership === 'object' ? church.localLeadership : {};

  const labels = [];

  for (const [key, label] of Object.entries(LOCAL_SINGLE_ROLE_LABELS)) {
    if (sameId(ll[key], userId)) labels.push(label);
  }

  const committee = Array.isArray(ll.committeeMembers) ? ll.committeeMembers : [];
  if (committee.some((id) => sameId(id, userId))) {
    labels.push('Committee member');
  }

  const councils = Array.isArray(church.councils) ? church.councils : [];
  for (const council of councils) {
    const cname = String(council.name || '').trim() || 'Council';
    for (const r of council.roles || []) {
      if (sameId(r.member, userId)) {
        const rl = String(r.roleLabel || r.roleKey || 'Role').trim();
        labels.push(`${cname}: ${rl}`);
      }
    }
  }

  return labels;
}

module.exports = {
  collectCongregationRoleLabelsForUser,
  LOCAL_SINGLE_ROLE_LABELS,
};

const MAIN_LEADERSHIP_KEYS = [
  'churchPresident',
  'vicePresident',
  'moderator',
  'viceModerator',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
  'minister',
  'superintendent',
  'viceSuperintendent',
  'conferenceMinister1',
  'conferenceMinister2',
];

const SUB_LEADERSHIP_KEYS = ['deacon', 'viceDeacon', 'secretary', 'viceSecretary', 'treasurer', 'viceTreasurer'];

const LEADERSHIP_ROLE_LABELS = {
  spiritualPastor: 'Spiritual pastor',
  churchPresident: 'Church president',
  vicePresident: 'Vice president',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  superintendent: 'Superintendent',
  viceSuperintendent: 'Vice superintendent',
  conferenceMinister1: 'Conference minister 1',
  conferenceMinister2: 'Conference minister 2',
  minister: 'Minister',
  deacon: 'Deacon',
  viceDeacon: 'Vice deacon',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
};

function leadershipKeysForChurchType(churchType) {
  const keys = churchType === 'MAIN' ? [...MAIN_LEADERSHIP_KEYS] : [...SUB_LEADERSHIP_KEYS];
  return ['spiritualPastor', ...keys];
}

/** Slots that must approve: every filled local leadership role on the church. */
function buildRequiredApprovers(church) {
  if (!church) return [];
  const leadership = church.localLeadership || {};
  const keys = leadershipKeysForChurchType(church.churchType);
  const seen = new Set();
  const approvers = [];
  for (const roleKey of keys) {
    const userId = leadership[roleKey];
    if (!userId || seen.has(String(userId))) continue;
    seen.add(String(userId));
    approvers.push({
      roleKey,
      roleLabel: LEADERSHIP_ROLE_LABELS[roleKey] || roleKey,
      userId,
    });
  }
  return approvers;
}

function userCanManageProcurementDraft(church, userId) {
  const uid = String(userId || '');
  if (!church || !uid) return false;
  const leadership = church.localLeadership || {};
  const manageKeys = ['viceTreasurer', 'treasurer', 'secretary', 'viceSecretary'];
  return manageKeys.some((k) => String(leadership[k] || '') === uid);
}

function userApprovalSlot(church, userId) {
  const uid = String(userId || '');
  if (!church || !uid) return null;
  const leadership = church.localLeadership || {};
  for (const roleKey of leadershipKeysForChurchType(church.churchType)) {
    if (String(leadership[roleKey] || '') === uid) return roleKey;
  }
  if (String(leadership.spiritualPastor || '') === uid) return 'spiritualPastor';
  return null;
}

function allApprovalsComplete(requiredApprovers, approvals) {
  if (!requiredApprovers.length) return false;
  const map = new Map((approvals || []).map((a) => [a.roleKey, a]));
  return requiredApprovers.every((req) => {
    const row = map.get(req.roleKey);
    return row && row.approved;
  });
}

module.exports = {
  LEADERSHIP_ROLE_LABELS,
  buildRequiredApprovers,
  userCanManageProcurementDraft,
  userApprovalSlot,
  allApprovalsComplete,
};

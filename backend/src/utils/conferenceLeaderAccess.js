const Conference = require('../models/Conference');

/** Matches `localLeadership` paths on Conference schema */
const CONFERENCE_LEADERSHIP_KEYS = [
  'superintendent',
  'viceSuperintendent',
  'moderator',
  'viceModerator',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
  'conferenceMinister1',
  'conferenceMinister2',
];

const CONFERENCE_LEADERSHIP_LABELS = {
  superintendent: 'Substantive superintendent',
  viceSuperintendent: 'Vice superintendent',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
  conferenceMinister1: 'Conference minister (1)',
  conferenceMinister2: 'Conference minister (2)',
};

const POPULATE_LEADERSHIP = CONFERENCE_LEADERSHIP_KEYS.map((key) => ({
  path: `localLeadership.${key}`,
  select: 'fullName email memberId',
}));

function leadershipOrCondition(userId) {
  const uid = userId;
  return CONFERENCE_LEADERSHIP_KEYS.map((key) => ({ [`localLeadership.${key}`]: uid }));
}

function rolesHeldInConferenceDoc(doc, userId) {
  const uid = String(userId);
  const ll = doc.localLeadership || {};
  const keys = CONFERENCE_LEADERSHIP_KEYS.filter((k) => {
    const v = ll[k];
    if (!v) return false;
    const id = typeof v === 'object' && v._id ? String(v._id) : String(v);
    return id === uid;
  });
  return keys.map((k) => ({
    key: k,
    label: CONFERENCE_LEADERSHIP_LABELS[k] || k,
  }));
}

/**
 * Lightweight summary for /api/auth/me (no populate).
 */
async function getConferenceLeadershipSummaryForMe(userId) {
  const docs = await Conference.find({
    $or: leadershipOrCondition(userId),
  })
    .select('name conferenceId localLeadership')
    .lean();

  const conferenceLeadership = docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    conferenceId: doc.conferenceId,
    roles: rolesHeldInConferenceDoc(doc, userId),
  }));

  return {
    isConferenceLeader: docs.length > 0,
    conferenceLeadership,
  };
}

module.exports = {
  CONFERENCE_LEADERSHIP_KEYS,
  CONFERENCE_LEADERSHIP_LABELS,
  POPULATE_LEADERSHIP,
  leadershipOrCondition,
  rolesHeldInConferenceDoc,
  getConferenceLeadershipSummaryForMe,
};

const Church = require('../models/Church');
const User = require('../models/User');
const PastorTerm = require('../models/PastorTerm');
const {
  rolesHeldInConferenceDoc,
  CONFERENCE_LEADERSHIP_KEYS,
} = require('../utils/conferenceLeaderAccess');
const { ACTIVE_PASTOR_TERM_STATUSES } = require('../utils/memberRoleSync');
const { SINGLE_ROLE_KEYS } = require('../utils/churchLeadershipValidation');

const PANEL_USER_FIELDS = 'fullName email memberId contactPhone firstName surname';

/** Populate paths for church detail on conference panel (extended member fields). */
const populateConferenceChurch = [
  { path: 'localLeadership.spiritualPastor', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.churchPresident', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.vicePresident', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.moderator', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.viceModerator', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.superintendent', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.viceSuperintendent', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.conferenceMinister1', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.conferenceMinister2', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.minister', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.deacon', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.viceDeacon', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.secretary', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.viceSecretary', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.treasurer', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.viceTreasurer', select: PANEL_USER_FIELDS },
  { path: 'localLeadership.committeeMembers', select: PANEL_USER_FIELDS },
  { path: 'councils.roles.member', select: PANEL_USER_FIELDS },
  { path: 'serviceCouncils.services.head', select: PANEL_USER_FIELDS },
];

const CHURCH_LOCAL_ROLE_LABELS = {
  spiritualPastor: 'Spiritual leader / pastor',
  churchPresident: 'Church president (minister)',
  vicePresident: 'Vice president (minister)',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  superintendent: 'Superintendent (minister)',
  viceSuperintendent: 'Vice superintendent (minister)',
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

function summarizeLeader(ref) {
  if (!ref) return null;
  const o = ref.toObject ? ref.toObject() : ref;
  return {
    id: String(o._id || o),
    fullName: o.fullName || '',
    email: o.email || '',
    memberId: o.memberId || '',
    contactPhone: o.contactPhone || '',
  };
}

function serializeConferenceLeadership(localLeadership) {
  const ll = localLeadership || {};
  const out = {};
  for (const key of CONFERENCE_LEADERSHIP_KEYS) {
    const ref = ll[key];
    out[key] = summarizeLeader(ref);
  }
  return out;
}

/** Only slots where the viewer is the assigned person (no other officers’ details). */
function conferenceLeadershipForViewer(serializedLL, viewerId) {
  const vid = String(viewerId);
  const out = {};
  for (const key of CONFERENCE_LEADERSHIP_KEYS) {
    const p = serializedLL[key];
    if (p && String(p.id) === vid) out[key] = p;
  }
  return out;
}

/** Strip email/phone for anyone except the viewer (names remain for context). */
function redactPerson(person, viewerId) {
  if (!person) return null;
  const vid = String(viewerId);
  const pid = String(person.id || '');
  if (pid === vid) {
    return {
      id: person.id,
      fullName: person.fullName || '',
      email: person.email || '',
      memberId: person.memberId || '',
      contactPhone: person.contactPhone || '',
    };
  }
  return {
    id: person.id,
    fullName: person.fullName || '',
    memberId: person.memberId || '',
    email: '',
    contactPhone: '',
  };
}

function serializeChurchDetailForViewer(ch, statsMap, pastorInfo, viewerId) {
  const detail = serializeChurchDetail(ch, statsMap, pastorInfo);
  const vid = String(viewerId);

  detail.leadership = detail.leadership.map((slot) => ({
    ...slot,
    person: redactPerson(slot.person, vid),
  }));

  detail.committeeMembers = detail.committeeMembers.filter((p) => String(p.id) === vid);

  detail.councils = detail.councils.map((council) => ({
    ...council,
    roles: council.roles.map((r) => ({
      ...r,
      member: r.member ? redactPerson(r.member, vid) : null,
    })),
  }));

  detail.serviceCouncils = detail.serviceCouncils.map((sc) => ({
    ...sc,
    services: (sc.services || []).map((svc) => {
      const headId = svc.head && svc.head.id ? String(svc.head.id) : '';
      const isSelfHead = headId === vid;
      return {
        ...svc,
        head: svc.head ? redactPerson(svc.head, vid) : null,
        contactName: isSelfHead ? svc.contactName || '' : '',
        contactPhone: isSelfHead ? svc.contactPhone || '' : '',
        contactEmail: isSelfHead ? svc.contactEmail || '' : '',
      };
    }),
  }));

  if (detail.pastoralAssignment?.pastor) {
    detail.pastoralAssignment = {
      ...detail.pastoralAssignment,
      pastor: redactPerson(detail.pastoralAssignment.pastor, vid),
    };
  }

  return detail;
}

function serializeChurchBase(ch) {
  const main = ch.mainChurch;
  return {
    _id: String(ch._id),
    name: ch.name,
    churchType: ch.churchType,
    isActive: ch.isActive !== false,
    address: ch.address || '',
    city: ch.city || '',
    stateOrProvince: ch.stateOrProvince || '',
    postalCode: ch.postalCode || '',
    country: ch.country || '',
    phone: ch.phone || '',
    email: ch.email || '',
    mainChurch:
      main && typeof main === 'object'
        ? { _id: String(main._id || ''), name: main.name || '', churchType: main.churchType || '' }
        : null,
    latitude: ch.latitude ?? null,
    longitude: ch.longitude ?? null,
    createdAt: ch.createdAt ? new Date(ch.createdAt).toISOString() : null,
    updatedAt: ch.updatedAt ? new Date(ch.updatedAt).toISOString() : null,
  };
}

function buildLeadershipRows(localLeadership) {
  const ll = localLeadership || {};
  return SINGLE_ROLE_KEYS.map((key) => ({
    key,
    label: CHURCH_LOCAL_ROLE_LABELS[key] || key,
    person: summarizeLeader(ll[key]),
  }));
}

function serializeCommittee(localLeadership) {
  const raw = localLeadership?.committeeMembers;
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => summarizeLeader(m)).filter(Boolean);
}

function serializeCouncils(councils) {
  if (!Array.isArray(councils)) return [];
  return councils.map((c) => ({
    name: String(c.name || '').trim() || 'Council',
    roles: (c.roles || []).map((r) => ({
      roleKey: r.roleKey || '',
      roleLabel: String(r.roleLabel || r.roleKey || 'Role').trim(),
      member: summarizeLeader(r.member),
    })),
  }));
}

function serializeServiceCouncils(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((sc) => ({
    name: String(sc.name || '').trim() || 'Service council',
    description: sc.description || '',
    isActive: sc.isActive !== false,
    services: (sc.services || []).map((svc) => ({
      name: String(svc.name || '').trim() || 'Service',
      isActive: svc.isActive !== false,
      head: summarizeLeader(svc.head),
      contactName: svc.contactName || '',
      contactPhone: svc.contactPhone || '',
      contactEmail: svc.contactEmail || '',
    })),
  }));
}

async function memberStatsByChurch(churchIds) {
  const ids = churchIds.map((id) => String(id));
  if (!ids.length) return new Map();
  const idSet = new Set(ids);

  const users = await User.find({
    $or: [{ church: { $in: churchIds } }, { adminChurches: { $in: churchIds } }],
    role: { $in: ['MEMBER', 'ADMIN'] },
  })
    .select('church adminChurches role isActive')
    .lean();

  const stats = new Map();
  for (const id of ids) {
    stats.set(id, { membersTotal: 0, membersActive: 0, churchAdmins: 0 });
  }

  for (const u of users) {
    const targets = new Set();
    if (u.church && idSet.has(String(u.church))) targets.add(String(u.church));
    for (const ac of u.adminChurches || []) {
      const s = String(ac);
      if (idSet.has(s)) targets.add(s);
    }
    for (const tid of targets) {
      const row = stats.get(tid);
      if (!row) continue;
      if (u.role === 'MEMBER') {
        row.membersTotal += 1;
        if (u.isActive !== false) row.membersActive += 1;
      }
      if (u.role === 'ADMIN') row.churchAdmins += 1;
    }
  }
  return stats;
}

async function assignedPastorByChurch(churchIds) {
  const map = new Map();
  if (!churchIds.length) return map;
  const terms = await PastorTerm.find({
    church: { $in: churchIds },
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .populate('pastor', PANEL_USER_FIELDS)
    .sort({ termEnd: -1 })
    .lean();

  for (const t of terms) {
    const cid = String(t.church);
    if (!map.has(cid)) {
      map.set(cid, {
        pastor: summarizeLeader(t.pastor),
        termStatus: t.status || '',
        termNumber: t.termNumber,
        termStart: t.termStart ? new Date(t.termStart).toISOString() : null,
        termEnd: t.termEnd ? new Date(t.termEnd).toISOString() : null,
      });
    }
  }
  return map;
}

function serializeChurchDetail(ch, statsMap, pastorInfo) {
  const base = serializeChurchBase(ch);
  const sid = String(ch._id);
  const st = statsMap.get(sid) || { membersTotal: 0, membersActive: 0, churchAdmins: 0 };

  return {
    ...base,
    leadership: buildLeadershipRows(ch.localLeadership),
    committeeMembers: serializeCommittee(ch.localLeadership),
    councils: serializeCouncils(ch.councils),
    serviceCouncils: serializeServiceCouncils(ch.serviceCouncils),
    memberStats: {
      membersTotal: st.membersTotal,
      membersActive: st.membersActive,
      churchAdmins: st.churchAdmins,
    },
    pastoralAssignment: pastorInfo || null,
  };
}

/**
 * GET /api/conference-panel/overview
 * Scoped to conferences where the user is in leadership. Returns only the viewer’s
 * conference-office assignments (not other officers), redacted church rosters (no
 * third-party email/phone except the viewer’s own rows), and aggregate member stats.
 */
async function getOverview(req, res) {
  const userId = req.user._id;
  const docs = req.leaderConferenceDocs || [];
  const conferences = [];

  for (const conf of docs) {
    const obj = conf.toObject ? conf.toObject({ virtuals: false }) : conf;

    const churches = await Church.find({ conference: conf._id })
      .populate('mainChurch', 'name churchType')
      .populate(populateConferenceChurch)
      .sort({ churchType: 1, name: 1 })
      .lean();

    const churchIds = churches.map((c) => c._id);

    const [statsMap, pastorMap] = await Promise.all([
      memberStatsByChurch(churchIds),
      assignedPastorByChurch(churchIds),
    ]);

    const fullConferenceLL = serializeConferenceLeadership(conf.localLeadership);

    conferences.push({
      conference: {
        _id: String(obj._id),
        name: obj.name,
        conferenceId: obj.conferenceId,
        description: obj.description || '',
        email: obj.email || '',
        phone: obj.phone || '',
        officeAddress: obj.officeAddress || '',
        city: obj.city || '',
        stateOrProvince: obj.stateOrProvince || '',
        postalCode: obj.postalCode || '',
        country: obj.country || '',
        isActive: obj.isActive !== false,
        localLeadership: conferenceLeadershipForViewer(fullConferenceLL, userId),
      },
      myRoles: rolesHeldInConferenceDoc(obj, userId),
      churches: churches.map((ch) =>
        serializeChurchDetailForViewer(ch, statsMap, pastorMap.get(String(ch._id)) || null, userId)
      ),
      churchCount: churches.length,
    });
  }

  return res.json({ conferences });
}

module.exports = {
  getOverview,
};

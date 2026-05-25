const mongoose = require('mongoose');
const PastorRecord = require('../models/PastorRecord');
const PastorTerm = require('../models/PastorTerm');
const User = require('../models/User');
const Church = require('../models/Church');
const { syncChurchMemberRoleDisplays, ACTIVE_PASTOR_TERM_STATUSES } = require('../utils/memberRoleSync');
const { pastorListChurchFilter } = require('../utils/pastorMainChurch');
const { getPaginationParams, paginatedResponse } = require('../utils/paginate');
const {
  MAX_TERM_CYCLES,
  parseTermLengthYears,
  maxTermsReachedMessage,
} = require('../utils/pastorTermConfig');
function hasSuperadminPanelAccess(role) {
  return role === 'SUPERADMIN' || role === 'CHURCH_ADMIN';
}

async function resolvePastorForSpiritualAssignment(targetChurchId, pastorUserId) {
  const church = await Church.findById(targetChurchId).select('churchType localLeadership councils name');
  if (!church) return { error: { status: 404, message: 'Church not found' } };

  if (church.churchType === 'MAIN') {
    const pastor = await User.findOne({
      _id: pastorUserId,
      role: { $in: ['MEMBER', 'ADMIN'] },
      memberCategory: 'PASTOR',
      isActive: true,
    }).populate('church', 'name churchType');
    if (!pastor) {
      return {
        error: {
          status: 400,
          message: 'Main church pastor must be an active PASTOR (minister) from a sub-church congregation',
        },
      };
    }
    const home = pastor.church;
    const homeType = home && typeof home === 'object' ? home.churchType : null;
    const homeId = home && typeof home === 'object' ? String(home._id) : String(home || '');
    if (homeType !== 'SUB') {
      return {
        error: {
          status: 400,
          message: 'Main church pastor must belong to a sub-church, not the main church or another congregation type',
        },
      };
    }
    if (homeId === String(targetChurchId)) {
      return {
        error: {
          status: 400,
          message: 'Main church pastor cannot be a member of the main church itself',
        },
      };
    }
    return { pastor, church };
  }

  const pastor = await User.findOne({
    _id: pastorUserId,
    role: { $in: ['MEMBER', 'ADMIN'] },
    church: targetChurchId,
    isActive: true,
  });
  if (!pastor) {
    return { error: { status: 400, message: 'Pastor must be an active member of the selected church' } };
  }
  return { pastor, church };
}

const OTHER_LEADERSHIP_ROLE_KEYS = [
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

function userHasAnyLeadershipRole(church, userId) {
  if (!church || !userId) return false;
  const uid = String(userId);
  const ll = church.localLeadership || {};
  if (ll.spiritualPastor && String(ll.spiritualPastor) === uid) return true;
  return userHasOtherLeadershipRole(church, userId);
}

function userHasOtherLeadershipRole(church, userId) {
  if (!church || !userId) return false;
  const uid = String(userId);
  const ll = church.localLeadership || {};
  for (const key of OTHER_LEADERSHIP_ROLE_KEYS) {
    if (ll[key] && String(ll[key]) === uid) return true;
  }
  if (Array.isArray(ll.committeeMembers) && ll.committeeMembers.some((id) => String(id) === uid)) return true;
  if (Array.isArray(church.councils)) {
    for (const c of church.councils) {
      if (Array.isArray(c.roles) && c.roles.some((r) => r.member && String(r.member) === uid)) return true;
    }
  }
  return false;
}

function spiritualPastorIdFromChurch(church) {
  const ll = church?.localLeadership || {};
  const sp = ll.spiritualPastor;
  if (!sp) return null;
  if (typeof sp === 'object' && sp._id) return String(sp._id);
  return String(sp);
}

function leaderDisplayName(pastorRef) {
  if (!pastorRef) return 'existing leader';
  if (typeof pastorRef === 'object') {
    return pastorRef.fullName || pastorRef.email || 'existing leader';
  }
  return 'existing leader';
}

async function buildLeadershipOnlyTermRows(churchFilter = {}) {
  const churchQuery = churchFilter.church ? { _id: churchFilter.church } : {};
  const churches = await Church.find(churchQuery)
    .select('name localLeadership')
    .populate('localLeadership.spiritualPastor', 'fullName email memberId')
    .lean();

  const activeTermChurchIds = await PastorTerm.find({
    ...(churchFilter.church ? { church: churchFilter.church } : {}),
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .distinct('church');

  const activeSet = new Set(activeTermChurchIds.map((id) => String(id)));
  const rows = [];

  for (const church of churches) {
    const churchId = String(church._id);
    if (activeSet.has(churchId)) continue;
    const pastor = church.localLeadership?.spiritualPastor;
    if (!pastor) continue;
    const pastorId = typeof pastor === 'object' && pastor._id ? String(pastor._id) : String(pastor);
    rows.push({
      _id: `leadership_${churchId}_${pastorId}`,
      _leadershipOnly: true,
      pastor: typeof pastor === 'object' ? pastor : { _id: pastorId },
      church: { _id: church._id, name: church.name },
      termNumber: 0,
      termLengthYears: null,
      termStart: null,
      termEnd: null,
      status: 'LEADERSHIP_ONLY',
      assignedBy: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  return rows;
}

function pastorChurchKey(churchId, pastorId) {
  return `${String(churchId)}:${String(pastorId)}`;
}

function coveredPastorKeysFromRows(termRows, leadershipRows, categoryRows = []) {
  const set = new Set();
  for (const row of [...termRows, ...leadershipRows, ...categoryRows]) {
    const cid =
      row.church && typeof row.church === 'object' && row.church._id
        ? String(row.church._id)
        : row.church
          ? String(row.church)
          : '';
    const pid =
      row.pastor && typeof row.pastor === 'object' && row.pastor._id
        ? String(row.pastor._id)
        : row.pastor
          ? String(row.pastor)
          : '';
    if (cid && pid) set.add(pastorChurchKey(cid, pid));
  }
  return set;
}

/** Members with PASTOR category but no active term row and not already in leadership merge. */
async function buildPastorCategoryOnlyTermRows(churchFilter = {}, coveredKeys = new Set()) {
  const userQuery = { isActive: true, memberCategory: 'PASTOR' };
  if (churchFilter.church) userQuery.church = churchFilter.church;

  const users = await User.find(userQuery)
    .select('_id fullName email memberId church')
    .populate('church', 'name')
    .lean();

  const rows = [];
  for (const user of users) {
    const churchId = user.church ? String(user.church._id || user.church) : '';
    if (!churchId) continue;
    const pastorId = String(user._id);
    if (coveredKeys.has(pastorChurchKey(churchId, pastorId))) continue;

    rows.push({
      _id: `category_${churchId}_${pastorId}`,
      _categoryOnly: true,
      pastor: { _id: user._id, fullName: user.fullName, email: user.email, memberId: user.memberId },
      church:
        user.church && typeof user.church === 'object' && user.church.name
          ? { _id: user.church._id, name: user.church.name }
          : { _id: churchId },
      termNumber: 0,
      termLengthYears: null,
      termStart: null,
      termEnd: null,
      status: 'CATEGORY_ONLY',
      assignedBy: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  return rows;
}

async function listPastorTermsMerged(req, res, filter) {
  const { page, limit, skip } = getPaginationParams(req.query);

  const termDocs = await PastorTerm.find(filter)
    .populate('pastor', 'fullName email memberId')
    .populate('church', 'name')
    .populate('transferredToChurch', 'name')
    .sort({ createdAt: -1 });

  termDocs.forEach(refreshStatus);
  await Promise.all(termDocs.map((r) => r.save()));

  const termRows = termDocs.map((r) => (r.toObject ? r.toObject() : r));
  const leadershipRows = await buildLeadershipOnlyTermRows(filter);
  const covered = coveredPastorKeysFromRows(termRows, leadershipRows);
  const categoryRows = await buildPastorCategoryOnlyTermRows(filter, covered);

  const combined = [...termRows, ...leadershipRows, ...categoryRows].sort((a, b) => {
    const an = (a.church && typeof a.church === 'object' ? a.church.name : '') || '';
    const bn = (b.church && typeof b.church === 'object' ? b.church.name : '') || '';
    const byChurch = an.localeCompare(bn, undefined, { sensitivity: 'base' });
    if (byChurch !== 0) return byChurch;
    const ap = a.pastor?.fullName || a.pastor?.email || '';
    const bp = b.pastor?.fullName || b.pastor?.email || '';
    return ap.localeCompare(bp, undefined, { sensitivity: 'base' });
  });

  const total = combined.length;
  const paged = combined.slice(skip, skip + limit);
  return res.json(paginatedResponse(paged, total, page, limit));
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function memberAddressString(member) {
  const address = (member && member.address) || {};
  return [address.line1, address.line2, address.city, address.stateOrProvince, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
}

function pickStr(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

/**
 * Maps request body (camelCase or snake_case) + member profile into
 * personal, credentials, and currentRole for PastorRecord.
 */
function buildPastorRecordFromBody(reqBody, member) {
  const b = reqBody || {};
  const memberAddr = memberAddressString(member);
  const name = pickStr(
    b.name,
    b.personal && b.personal.name,
    member.fullName,
    `${(member.firstName || '').trim()} ${(member.surname || '').trim()}`.trim()
  );
  const address = pickStr(b.address, b.personal && b.personal.address) || memberAddr;
  const rawEmail = pickStr(
    b.contactEmail,
    b.contact_email,
    b.personal && b.personal.contactEmail,
    b.personal && b.personal.email,
    member.email
  );
  const contactEmail = rawEmail ? rawEmail.toLowerCase() : '';
  const contactPhone = pickStr(
    b.contactPhone,
    b.contact_phone,
    b.personal && b.personal.contactPhone,
    member.contactPhone
  );
  const title = pickStr(b.title, b.personal && b.personal.title);
  const gender = pickStr(b.gender, b.personal && b.personal.gender, member.gender);
  const dateOfBirth = parseDate(
    b.dateOfBirth != null
      ? b.dateOfBirth
      : b.date_of_birth != null
        ? b.date_of_birth
        : b.personal && b.personal.dateOfBirth != null
          ? b.personal.dateOfBirth
          : member.dateOfBirth
  );
  const credIn = b.credentials || {};
  const qualRaw = credIn.qualifications != null ? credIn.qualifications : b.qualifications;
  let qualifications;
  if (Array.isArray(qualRaw)) {
    qualifications = qualRaw.map((q) => String(q).trim()).filter(Boolean);
  } else if (typeof qualRaw === 'string' && qualRaw.trim()) {
    qualifications = qualRaw.split(/[,\n]/).map((q) => q.trim()).filter(Boolean);
  } else {
    qualifications = [];
  }
  const personal = {
    name,
    title,
    contactEmail,
    contactPhone,
    dateOfBirth,
    gender,
    address,
    fullName: name,
    email: contactEmail,
    addressText: address,
  };
  const credentials = {
    ordinationDate: parseDate(
      credIn.ordinationDate != null
        ? credIn.ordinationDate
        : b.ordinationDate != null
          ? b.ordinationDate
          : b.ordination_date
    ),
    denomination: String(credIn.denomination || b.denomination || '').trim(),
    qualifications,
  };
  const currentRole = String(b.currentRole != null ? b.currentRole : b.current_role != null ? b.current_role : '').trim();
  return { personal, credentials, currentRole };
}

function churchId(req) {
  return req.user?.church ? String(req.user.church) : '';
}

async function listPastors(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { church: cid };
  const [total, rows] = await Promise.all([
    PastorRecord.countDocuments(filter),
    PastorRecord.find(filter)
      .populate('member', 'fullName email memberId contactPhone')
      .populate('church', 'name churchType')
      .sort({ 'personal.name': 1, 'personal.fullName': 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  return res.json(paginatedResponse(rows, total, page, limit));
}

async function listEligibleMembers(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await User.find({ role: { $in: ['MEMBER', 'ADMIN'] }, church: cid, isActive: true })
    .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender')
    .sort({ fullName: 1, email: 1 });
  return res.json(rows);
}

async function createPastor(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const b = req.body || {};
  const { memberId, isActive } = b;
  if (!memberId) return res.status(400).json({ message: 'memberId is required' });

  const member = await User.findOne({ _id: memberId, role: { $in: ['MEMBER', 'ADMIN'] }, church: cid, isActive: true });
  if (!member) {
    return res.status(400).json({ message: 'Pastor must be an active member of this church' });
  }

  const { personal, credentials, currentRole } = buildPastorRecordFromBody(b, member);

  const doc = await PastorRecord.create({
    church: cid,
    member: member._id,
    personal,
    currentRole,
    credentials,
    isActive: isActive !== false,
  });

  const fresh = await PastorRecord.findById(doc._id)
    .populate('member', 'fullName email memberId contactPhone')
    .populate('church', 'name churchType');
  return res.status(201).json(fresh);
}

async function listEligibleMembersForSuperadmin(req, res) {
  const targetChurchId = String(req.query.churchId || '');
  if (!targetChurchId) return res.status(400).json({ message: 'churchId is required' });
  const church = await Church.findById(targetChurchId).select('churchType name').lean();
  if (!church) return res.status(404).json({ message: 'Church not found' });

  if (church.churchType === 'MAIN') {
    const subChurchIds = await Church.find({ churchType: 'SUB', isActive: { $ne: false } }).distinct('_id');
    const rows = await User.find({
      role: { $in: ['MEMBER', 'ADMIN'] },
      memberCategory: 'PASTOR',
      isActive: true,
      church: { $in: subChurchIds },
    })
      .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender memberCategory role')
      .populate('church', 'name churchType')
      .sort({ fullName: 1, email: 1 });
    return res.json(rows);
  }

  const rows = await User.find({ role: { $in: ['MEMBER', 'ADMIN'] }, church: targetChurchId, isActive: true })
    .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender memberCategory role')
    .sort({ fullName: 1, email: 1 });
  return res.json(rows);
}

async function createPastorForSuperadmin(req, res) {
  const targetChurchId = String(req.body?.churchId || '');
  if (!targetChurchId) return res.status(400).json({ message: 'churchId is required' });
  const b = req.body || {};
  const { memberId, isActive } = b;
  if (!memberId) return res.status(400).json({ message: 'memberId is required' });

  const member = await User.findOne({ _id: memberId, role: { $in: ['MEMBER', 'ADMIN'] }, church: targetChurchId, isActive: true });
  if (!member) {
    return res.status(400).json({ message: 'Pastor/Reverend must be an active member of the selected church' });
  }

  const { personal, credentials, currentRole } = buildPastorRecordFromBody(b, member);

  const doc = await PastorRecord.create({
    church: targetChurchId,
    member: member._id,
    personal,
    currentRole,
    credentials,
    isActive: isActive !== false,
  });

  const fresh = await PastorRecord.findById(doc._id)
    .populate('member', 'fullName email memberId contactPhone')
    .populate('church', 'name churchType');
  return res.status(201).json(fresh);
}

async function listPastorsForSuperadmin(req, res) {
  const churchFilter = await pastorListChurchFilter(
    req.query.churchId ? String(req.query.churchId) : ''
  );
  const { page, limit, skip } = getPaginationParams(req.query);

  // Fetch formal PastorRecord documents (all, to merge with synthetic before paginating)
  const rows = await PastorRecord.find(churchFilter)
    .populate('church', 'name churchType')
    .populate('member', 'fullName email memberId contactPhone')
    .sort({ 'personal.name': 1, createdAt: -1 });

  // Track which user IDs already have a formal PastorRecord
  const recordMemberIds = new Set(
    rows.map((r) => String(r.member?._id || r.member || '')).filter(Boolean)
  );

  // Fetch active PastorTerms for the same church scope
  const ACTIVE_STATUSES = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'];
  const terms = await PastorTerm.find({ ...churchFilter, status: { $in: ACTIVE_STATUSES } })
    .populate('pastor', 'fullName email memberId contactPhone memberCategory')
    .populate('church', 'name churchType');

  // Build synthetic "term-only" entries for pastors who have no PastorRecord
  const synthetic = [];
  const seenTermPastors = new Set();
  for (const term of terms) {
    const pastorId = String(term.pastor?._id || term.pastor || '');
    if (!pastorId || recordMemberIds.has(pastorId) || seenTermPastors.has(pastorId)) continue;
    seenTermPastors.add(pastorId);
    synthetic.push({
      _id: `term_${term._id}`,
      _termOnly: true,
      _termId: String(term._id),
      personal: {
        name: term.pastor?.fullName || term.pastor?.email || 'Unknown',
        contactEmail: term.pastor?.email || '',
        contactPhone: term.pastor?.contactPhone || '',
      },
      church: term.church,
      member: term.pastor,
      currentRole: 'Spiritual Leader',
      isActive: true,
    });
  }

  const combined = [
    ...rows.map((r) => r.toObject ? r.toObject() : r),
    ...synthetic,
  ];
  combined.sort((a, b) => (a.personal?.name || '').localeCompare(b.personal?.name || ''));
  const total = combined.length;
  const paged = combined.slice(skip, skip + limit);
  return res.json(paginatedResponse(paged, total, page, limit));
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function refreshStatus(row) {
  if (!row || row.status === 'TRANSFERRED') return row;
  if (new Date() > row.termEnd && row.termNumber >= MAX_TERM_CYCLES) {
    row.status = 'TRANSFER_REQUIRED';
  }
  return row;
}

async function listAdminPastorTerms(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  return listPastorTermsMerged(req, res, { church: cid });
}

async function listSuperadminPastorTerms(req, res) {
  const filter = await pastorListChurchFilter(
    req.query.churchId ? String(req.query.churchId) : ''
  );
  return listPastorTermsMerged(req, res, filter);
}

async function assignPastorTerm(req, res) {
  const isPanel = hasSuperadminPanelAccess(req.user.role);
  const targetChurchId = isPanel ? String(req.body.churchId || '') : churchId(req);
  const { pastorUserId, termLengthYears: termLengthYearsRaw } = req.body || {};
  if (!targetChurchId || !pastorUserId) {
    return res.status(400).json({ message: 'churchId and pastorUserId are required' });
  }
  const termLengthYears = parseTermLengthYears(termLengthYearsRaw);

  const resolved = await resolvePastorForSpiritualAssignment(targetChurchId, pastorUserId);
  if (resolved.error) {
    return res.status(resolved.error.status).json({ message: resolved.error.message });
  }
  const { pastor, church } = resolved;

  const existing = await PastorTerm.findOne({
    pastor: pastor._id,
    church: targetChurchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  }).select('_id');
  if (existing) return res.status(409).json({ message: 'This pastor already has an active assignment in this church' });

  const leadershipPastorId = spiritualPastorIdFromChurch(church);
  if (leadershipPastorId && leadershipPastorId !== String(pastor._id)) {
    const leaderUser = await User.findById(leadershipPastorId).select('fullName email').lean();
    return res.status(409).json({
      message: `This church already has a spiritual pastor in leadership (${leaderDisplayName(leaderUser)}). Remove or replace them before assigning another.`,
    });
  }

  if (userHasOtherLeadershipRole(church, pastor._id)) {
    return res.status(409).json({
      message: 'This member already holds another church leadership office and cannot be spiritual leader.',
    });
  }

  const activeLeaderInChurch = await PastorTerm.findOne({
    church: targetChurchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .populate('pastor', 'fullName email')
    .select('pastor');
  if (activeLeaderInChurch && String(activeLeaderInChurch.pastor?._id || activeLeaderInChurch.pastor) !== String(pastor._id)) {
    return res.status(409).json({
      message: `This church already has an active spiritual leader term (${leaderDisplayName(activeLeaderInChurch.pastor)}). Transfer or close it before assigning another.`,
    });
  }

  const start = new Date();
  const row = await PastorTerm.create({
    pastor: pastor._id,
    church: targetChurchId,
    assignedBy: req.user._id,
    termNumber: 1,
    termLengthYears,
    termStart: start,
    termEnd: addYears(start, termLengthYears),
    status: 'ASSIGNED',
  });

  if (!church.localLeadership) church.localLeadership = {};
  church.localLeadership.spiritualPastor = pastor._id;
  await church.save();

  const populated = await PastorTerm.findById(row._id).populate('pastor', 'fullName email memberId').populate('church', 'name');
  await syncChurchMemberRoleDisplays(church.toObject ? church.toObject() : church);
  return res.status(201).json(populated);
}

async function renewPastorTerm(req, res) {
  const row = await PastorTerm.findById(req.params.termId);
  if (!row) return res.status(404).json({ message: 'Pastor assignment not found' });
  const isPanel = hasSuperadminPanelAccess(req.user.role);
  if (!isPanel && String(row.church) !== churchId(req)) return res.status(403).json({ message: 'Not allowed' });

  refreshStatus(row);
  const termLengthYears = parseTermLengthYears(row.termLengthYears);
  if (row.status === 'TRANSFER_REQUIRED' || row.termNumber >= MAX_TERM_CYCLES) {
    return res.status(400).json({ message: maxTermsReachedMessage(termLengthYears) });
  }
  row.termNumber += 1;
  row.termEnd = addYears(row.termEnd, termLengthYears);
  row.status = 'RENEWED';
  row.renewalHistory.push({ renewedAt: new Date(), renewedBy: req.user._id });
  await row.save();
  const populated = await PastorTerm.findById(row._id).populate('pastor', 'fullName email memberId').populate('church', 'name');
  return res.json(populated);
}

async function transferPastor(req, res) {
  if (!hasSuperadminPanelAccess(req.user.role)) {
    return res.status(403).json({ message: 'Only denomination panel users can transfer pastors' });
  }
  const row = await PastorTerm.findById(req.params.termId);
  if (!row) return res.status(404).json({ message: 'Pastor assignment not found' });
  const toChurchId = String(req.body.toChurchId || '');
  if (!toChurchId) return res.status(400).json({ message: 'toChurchId is required' });
  if (String(row.church) === toChurchId) return res.status(400).json({ message: 'Target church must be different' });

  const targetChurch = await Church.findOne({ _id: toChurchId, isActive: true }).select('_id churchType');
  if (!targetChurch) return res.status(400).json({ message: 'Target church not found or inactive' });

  if (targetChurch.churchType === 'MAIN') {
    const resolved = await resolvePastorForSpiritualAssignment(toChurchId, row.pastor);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }
  }
  const targetActiveLeader = await PastorTerm.findOne({
    church: toChurchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .populate('pastor', 'fullName email')
    .select('pastor');
  if (targetActiveLeader) {
    const leader =
      targetActiveLeader.pastor && typeof targetActiveLeader.pastor === 'object'
        ? targetActiveLeader.pastor.fullName || targetActiveLeader.pastor.email || 'existing leader'
        : 'existing leader';
    return res.status(409).json({
      message: `Target church already has an active spiritual leader (${leader}).`,
    });
  }

  const targetChurchDoc = await Church.findById(toChurchId).select('localLeadership councils');
  if (userHasAnyLeadershipRole(targetChurchDoc, row.pastor)) {
    return res.status(409).json({ message: 'Pastor cannot be transferred to a church where they already hold another leadership role' });
  }

  const pastor = await User.findById(row.pastor);
  if (!pastor) return res.status(404).json({ message: 'Pastor user not found' });
  if (targetChurch.churchType !== 'MAIN') {
    pastor.church = targetChurch._id;
    await pastor.save();
  }

  row.status = 'TRANSFERRED';
  row.transferredToChurch = targetChurch._id;
  await row.save();

  const transferTermYears = parseTermLengthYears(req.body.termLengthYears ?? row.termLengthYears);
  const start = new Date();
  const next = await PastorTerm.create({
    pastor: pastor._id,
    church: targetChurch._id,
    assignedBy: req.user._id,
    termNumber: 1,
    termLengthYears: transferTermYears,
    termStart: start,
    termEnd: addYears(start, transferTermYears),
    status: 'ASSIGNED',
  });

  if (targetChurchDoc) {
    if (!targetChurchDoc.localLeadership) targetChurchDoc.localLeadership = {};
    targetChurchDoc.localLeadership.spiritualPastor = pastor._id;
    await targetChurchDoc.save();
  }

  const fromChurchDoc = await Church.findById(row.church).select('_id churchType localLeadership councils');
  if (fromChurchDoc) {
    const prevPastorId = spiritualPastorIdFromChurch(fromChurchDoc);
    if (prevPastorId && String(prevPastorId) === String(pastor._id)) {
      if (!fromChurchDoc.localLeadership) fromChurchDoc.localLeadership = {};
      fromChurchDoc.localLeadership.spiritualPastor = null;
      await fromChurchDoc.save();
    }
    await syncChurchMemberRoleDisplays(fromChurchDoc.toObject ? fromChurchDoc.toObject() : fromChurchDoc);
  }

  const populated = await PastorTerm.findById(next._id).populate('pastor', 'fullName email memberId').populate('church', 'name');
  if (targetChurchDoc) await syncChurchMemberRoleDisplays(targetChurchDoc.toObject ? targetChurchDoc.toObject() : targetChurchDoc);
  return res.status(201).json(populated);
}

// ── Single-record CRUD (admin scope) ─────────────────────────────────────────

async function getPastor(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const record = await PastorRecord.findOne({ _id: req.params.recordId, church: cid })
    .populate('member', 'fullName firstName surname email memberId contactPhone role memberCategory isActive adminChurches')
    .populate('church', 'name churchType');
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  return res.json(record);
}

async function updatePastor(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const record = await PastorRecord.findOne({ _id: req.params.recordId, church: cid });
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  const member = await User.findById(record.member);
  const { personal, credentials, currentRole } = buildPastorRecordFromBody(req.body, member || {});
  record.personal = personal;
  record.credentials = credentials;
  record.currentRole = currentRole;
  await record.save();
  const fresh = await PastorRecord.findById(record._id)
    .populate('member', 'fullName firstName surname email memberId contactPhone role memberCategory isActive adminChurches')
    .populate('church', 'name churchType');
  return res.json(fresh);
}

async function togglePastorActive(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const record = await PastorRecord.findOne({ _id: req.params.recordId, church: cid });
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  record.isActive = !record.isActive;
  await record.save();
  return res.json({ isActive: record.isActive });
}

async function deletePastorRecord(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const record = await PastorRecord.findOneAndDelete({ _id: req.params.recordId, church: cid });
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  return res.json({ message: 'Pastor record deleted' });
}

// ── Member upgrades & access management (admin scope) ─────────────────────────

async function listAllMembersForUpgrade(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await User.find({ church: cid, isActive: true, role: { $in: ['MEMBER', 'ADMIN'] } })
    .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender role memberCategory adminChurches')
    .sort({ fullName: 1, email: 1 });
  return res.json(rows);
}

async function upgradeMemberToPastor(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const member = await User.findOne({ _id: req.params.userId, church: cid, isActive: true });
  if (!member) return res.status(404).json({ message: 'Member not found in this church' });
  member.memberCategory = 'PASTOR';
  await member.save();
  return res.json({ message: 'Member upgraded to PASTOR category', memberCategory: member.memberCategory });
}

async function grantAdminAccess(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const member = await User.findOne({ _id: req.params.userId, church: cid, isActive: true });
  if (!member) return res.status(404).json({ message: 'Member not found in this church' });
  if (member.role === 'SUPERADMIN' || member.role === 'CHURCH_ADMIN') {
    return res.status(400).json({ message: 'Cannot modify system or denomination admin role' });
  }
  if (member.role === 'ADMIN') return res.status(400).json({ message: 'Member already has admin access' });
  member.role = 'ADMIN';
  const cidStr = String(cid);
  if (!member.adminChurches.map(String).includes(cidStr)) member.adminChurches.push(cid);
  await member.save();
  return res.json({ message: 'Admin access granted', role: member.role });
}

async function revokeAdminAccess(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const member = await User.findOne({ _id: req.params.userId, church: cid, isActive: true });
  if (!member) return res.status(404).json({ message: 'Member not found in this church' });
  if (member.role === 'SUPERADMIN' || member.role === 'CHURCH_ADMIN') {
    return res.status(400).json({ message: 'Cannot modify system or denomination admin role' });
  }
  if (member.role !== 'ADMIN') return res.status(400).json({ message: 'Member does not have admin access' });
  member.role = 'MEMBER';
  member.adminChurches = (member.adminChurches || []).filter((id) => String(id) !== String(cid));
  await member.save();
  return res.json({ message: 'Admin access revoked', role: member.role });
}

// ── Single-record CRUD (superadmin scope) ────────────────────────────────────

function parseSuperadminChurchId(req) {
  return String(req.query.churchId || req.body?.churchId || req.params.churchId || '');
}

function isPastorRecordObjectId(id) {
  const s = String(id || '');
  return mongoose.Types.ObjectId.isValid(s) && String(new mongoose.Types.ObjectId(s)) === s;
}

async function getPastorForSuperadmin(req, res) {
  if (!isPastorRecordObjectId(req.params.recordId)) {
    return res.status(404).json({ message: 'Pastor record not found' });
  }
  const record = await PastorRecord.findById(req.params.recordId)
    .populate('member', 'fullName firstName surname email memberId contactPhone role memberCategory isActive adminChurches')
    .populate('church', 'name churchType');
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  return res.json(record);
}

async function updatePastorForSuperadmin(req, res) {
  if (!isPastorRecordObjectId(req.params.recordId)) {
    return res.status(404).json({ message: 'Pastor record not found' });
  }
  const record = await PastorRecord.findById(req.params.recordId);
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  const member = await User.findById(record.member);
  const { personal, credentials, currentRole } = buildPastorRecordFromBody(req.body, member || {});
  record.personal = personal;
  record.credentials = credentials;
  record.currentRole = currentRole;
  await record.save();
  const fresh = await PastorRecord.findById(record._id)
    .populate('member', 'fullName firstName surname email memberId contactPhone role memberCategory isActive adminChurches')
    .populate('church', 'name churchType');
  return res.json(fresh);
}

async function togglePastorActiveForSuperadmin(req, res) {
  if (!isPastorRecordObjectId(req.params.recordId)) {
    return res.status(404).json({ message: 'Pastor record not found' });
  }
  const record = await PastorRecord.findById(req.params.recordId);
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  record.isActive = !record.isActive;
  await record.save();
  return res.json({ isActive: record.isActive });
}

async function deletePastorRecordForSuperadmin(req, res) {
  if (!isPastorRecordObjectId(req.params.recordId)) {
    return res.status(404).json({ message: 'Pastor record not found' });
  }
  const record = await PastorRecord.findByIdAndDelete(req.params.recordId);
  if (!record) return res.status(404).json({ message: 'Pastor record not found' });
  return res.json({ message: 'Pastor record deleted' });
}

async function listAllMembersForUpgradeForSuperadmin(req, res) {
  const targetChurchId = String(req.query.churchId || '');
  if (!targetChurchId) return res.status(400).json({ message: 'churchId is required' });

  const [directMembers, pastorRecords, pastorTerms] = await Promise.all([
    User.find({ church: targetChurchId, isActive: true, role: { $in: ['MEMBER', 'ADMIN'] } })
      .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender role memberCategory adminChurches'),
    PastorRecord.find({ church: targetChurchId }).select('member'),
    PastorTerm.find({ church: targetChurchId }).select('pastor'),
  ]);

  const seenIds = new Set(directMembers.map((m) => String(m._id)));

  const extraIdSet = new Set(
    [...pastorRecords.map((p) => String(p.member)), ...pastorTerms.map((t) => String(t.pastor))]
      .filter((id) => !seenIds.has(id))
  );

  let combined = [...directMembers];
  if (extraIdSet.size > 0) {
    const extra = await User.find({ _id: { $in: [...extraIdSet] } })
      .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender role memberCategory adminChurches');
    combined = [...combined, ...extra.filter((u) => u.isActive !== false)];
  }

  combined.sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));
  return res.json(combined);
}

async function upgradeMemberToPastorForSuperadmin(req, res) {
  const member = await User.findOne({ _id: req.params.userId, isActive: true });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  member.memberCategory = 'PASTOR';
  await member.save();

  if (member.church) {
    const church = await Church.findById(member.church).select('localLeadership councils');
    if (church) {
      const currentLeaderId = spiritualPastorIdFromChurch(church);
      if (!currentLeaderId) {
        if (!church.localLeadership) church.localLeadership = {};
        church.localLeadership.spiritualPastor = member._id;
        await church.save();
        await syncChurchMemberRoleDisplays(church.toObject ? church.toObject() : church);
      }
    }
  }

  return res.json({
    message: 'Member upgraded to PASTOR category',
    memberCategory: member.memberCategory,
    churchId: member.church ? String(member.church) : null,
  });
}

async function grantAdminAccessForSuperadmin(req, res) {
  const member = await User.findOne({ _id: req.params.userId, isActive: true });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (member.role === 'SUPERADMIN' || member.role === 'CHURCH_ADMIN') {
    return res.status(400).json({ message: 'Cannot modify system or denomination admin role' });
  }
  if (member.role === 'ADMIN') return res.status(400).json({ message: 'Member already has admin access' });
  const churchRef = member.church;
  member.role = 'ADMIN';
  if (churchRef && !member.adminChurches.map(String).includes(String(churchRef))) {
    member.adminChurches.push(churchRef);
  }
  await member.save();
  return res.json({ message: 'Admin access granted', role: member.role });
}

async function revokeAdminAccessForSuperadmin(req, res) {
  const member = await User.findOne({ _id: req.params.userId, isActive: true });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (member.role === 'SUPERADMIN' || member.role === 'CHURCH_ADMIN') {
    return res.status(400).json({ message: 'Cannot modify system or denomination admin role' });
  }
  if (member.role !== 'ADMIN') return res.status(400).json({ message: 'Member does not have admin access' });
  member.role = 'MEMBER';
  member.adminChurches = [];
  await member.save();
  return res.json({ message: 'Admin access revoked', role: member.role });
}

// ── Superadmin: assign pastor term ───────────────────────────────────────────

async function assignPastorTermForSuperadmin(req, res) {
  return assignPastorTerm(req, res);
}

async function removeSpiritualLeader(req, res) {
  const termId = String(req.params.termId || '');
  const isPanel = hasSuperadminPanelAccess(req.user.role);
  const adminCid = churchId(req);

  const syntheticMatch =
    /^leadership_([a-f0-9]{24})_([a-f0-9]{24})$/i.exec(termId) ||
    /^category_([a-f0-9]{24})_([a-f0-9]{24})$/i.exec(termId);

  if (syntheticMatch) {
    if (!isPanel) return res.status(403).json({ message: 'Not allowed' });
    const [, churchIdParam, pastorUserId] = syntheticMatch;
    const church = await Church.findById(churchIdParam).select('churchType localLeadership councils');
    if (!church) return res.status(404).json({ message: 'Church not found' });

    const currentId = spiritualPastorIdFromChurch(church);
    if (currentId && String(currentId) === String(pastorUserId)) {
      if (!church.localLeadership) church.localLeadership = {};
      church.localLeadership.spiritualPastor = null;
      await church.save();
    }

    await PastorTerm.deleteMany({ church: churchIdParam, pastor: pastorUserId });

    const member = await User.findById(pastorUserId);
    if (
      member &&
      member.memberCategory === 'PASTOR' &&
      church.churchType !== 'MAIN' &&
      String(member.church) === String(churchIdParam)
    ) {
      member.memberCategory = 'MEMBER';
      await member.save();
    }

    await syncChurchMemberRoleDisplays(church.toObject ? church.toObject() : church);
    const kind = termId.startsWith('category_') ? 'PASTOR category and leadership' : 'church leadership';
    return res.json({ message: `Spiritual leader removed (${kind})` });
  }

  const row = await PastorTerm.findById(termId);
  if (!row) return res.status(404).json({ message: 'Pastor assignment not found' });
  if (!isPanel && String(row.church) !== adminCid) return res.status(403).json({ message: 'Not allowed' });

  const church = await Church.findById(row.church).select('churchType localLeadership councils');
  if (church) {
    const currentId = spiritualPastorIdFromChurch(church);
    if (currentId && String(currentId) === String(row.pastor)) {
      if (!church.localLeadership) church.localLeadership = {};
      church.localLeadership.spiritualPastor = null;
      await church.save();
    }
  }

  await PastorTerm.findByIdAndDelete(row._id);

  const member = await User.findById(row.pastor);
  if (
    member &&
    member.memberCategory === 'PASTOR' &&
    church?.churchType !== 'MAIN' &&
    String(member.church) === String(row.church)
  ) {
    member.memberCategory = 'MEMBER';
    await member.save();
  }

  if (church) await syncChurchMemberRoleDisplays(church.toObject ? church.toObject() : church);
  return res.json({ message: 'Spiritual leader term removed' });
}

module.exports = {
  listPastors,
  listEligibleMembers,
  createPastor,
  getPastor,
  updatePastor,
  togglePastorActive,
  deletePastorRecord,
  listAllMembersForUpgrade,
  upgradeMemberToPastor,
  grantAdminAccess,
  revokeAdminAccess,
  listEligibleMembersForSuperadmin,
  createPastorForSuperadmin,
  listPastorsForSuperadmin,
  getPastorForSuperadmin,
  updatePastorForSuperadmin,
  togglePastorActiveForSuperadmin,
  deletePastorRecordForSuperadmin,
  listAllMembersForUpgradeForSuperadmin,
  upgradeMemberToPastorForSuperadmin,
  grantAdminAccessForSuperadmin,
  revokeAdminAccessForSuperadmin,
  listAdminPastorTerms,
  listSuperadminPastorTerms,
  assignPastorTerm,
  assignPastorTermForSuperadmin,
  renewPastorTerm,
  transferPastor,
  removeSpiritualLeader,
};

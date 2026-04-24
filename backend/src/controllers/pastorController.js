const PastorRecord = require('../models/PastorRecord');
const PastorTerm = require('../models/PastorTerm');
const User = require('../models/User');
const Church = require('../models/Church');
const { syncChurchMemberRoleDisplays, ACTIVE_PASTOR_TERM_STATUSES } = require('../utils/memberRoleSync');
const TERM_YEARS = 4;
const MAX_TERMS = 2;

function userHasAnyLeadershipRole(church, userId) {
  if (!church || !userId) return false;
  const uid = String(userId);
  const ll = church.localLeadership || {};
  const singleKeys = ['spiritualPastor', 'deacon', 'viceDeacon', 'secretary', 'viceSecretary', 'treasurer'];
  for (const key of singleKeys) {
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
  const rows = await PastorRecord.find({ church: cid })
    .populate('member', 'fullName email memberId contactPhone')
    .populate('church', 'name churchType')
    .sort({ 'personal.name': 1, 'personal.fullName': 1, createdAt: -1 });
  return res.json(rows);
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
  const rows = await User.find({ role: { $in: ['MEMBER', 'ADMIN'] }, church: targetChurchId, isActive: true })
    .select('_id fullName firstName surname email memberId contactPhone address dateOfBirth gender')
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
  const churchFilter = req.query.churchId ? { church: req.query.churchId } : {};
  const rows = await PastorRecord.find(churchFilter)
    .populate('church', 'name churchType')
    .populate('member', 'fullName email memberId contactPhone')
    .sort({ 'personal.name': 1, 'personal.fullName': 1, createdAt: -1 });
  return res.json(rows);
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function refreshStatus(row) {
  if (!row || row.status === 'TRANSFERRED') return row;
  if (new Date() > row.termEnd && row.termNumber >= MAX_TERMS) {
    row.status = 'TRANSFER_REQUIRED';
  }
  return row;
}

async function listAdminPastorTerms(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await PastorTerm.find({ church: cid })
    .populate('pastor', 'fullName email memberId')
    .populate('church', 'name')
    .sort({ createdAt: -1 });
  rows.forEach(refreshStatus);
  await Promise.all(rows.map((r) => r.save()));
  return res.json(rows);
}

async function listSuperadminPastorTerms(req, res) {
  const filter = req.query.churchId ? { church: req.query.churchId } : {};
  const rows = await PastorTerm.find(filter)
    .populate('pastor', 'fullName email memberId')
    .populate('church', 'name')
    .populate('transferredToChurch', 'name')
    .sort({ createdAt: -1 });
  rows.forEach(refreshStatus);
  await Promise.all(rows.map((r) => r.save()));
  return res.json(rows);
}

async function assignPastorTerm(req, res) {
  const isSuper = req.user.role === 'SUPERADMIN';
  const targetChurchId = isSuper ? String(req.body.churchId || '') : churchId(req);
  const { pastorUserId } = req.body || {};
  if (!targetChurchId || !pastorUserId) {
    return res.status(400).json({ message: 'churchId and pastorUserId are required' });
  }

  const pastor = await User.findOne({ _id: pastorUserId, role: { $in: ['MEMBER', 'ADMIN'] }, church: targetChurchId, isActive: true });
  if (!pastor) return res.status(400).json({ message: 'Pastor must be an active member of the selected church' });

  const existing = await PastorTerm.findOne({
    pastor: pastor._id,
    church: targetChurchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  }).select('_id');
  if (existing) return res.status(409).json({ message: 'This pastor already has an active assignment in this church' });
  const church = await Church.findById(targetChurchId).select('localLeadership councils');
  if (userHasAnyLeadershipRole(church, pastor._id)) {
    return res.status(409).json({ message: 'This member already has a leadership role and cannot also be spiritual leader' });
  }
  const activeLeaderInChurch = await PastorTerm.findOne({
    church: targetChurchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .populate('pastor', 'fullName email')
    .select('pastor');
  if (activeLeaderInChurch) {
    const leader =
      activeLeaderInChurch.pastor && typeof activeLeaderInChurch.pastor === 'object'
        ? activeLeaderInChurch.pastor.fullName || activeLeaderInChurch.pastor.email || 'existing leader'
        : 'existing leader';
    return res.status(409).json({
      message: `This church already has an active spiritual leader (${leader}). Transfer or close current leadership before assigning another.`,
    });
  }

  const start = new Date();
  const row = await PastorTerm.create({
    pastor: pastor._id,
    church: targetChurchId,
    assignedBy: req.user._id,
    termNumber: 1,
    termStart: start,
    termEnd: addYears(start, TERM_YEARS),
    status: 'ASSIGNED',
  });
  const populated = await PastorTerm.findById(row._id).populate('pastor', 'fullName email memberId').populate('church', 'name');
  if (church) await syncChurchMemberRoleDisplays({ _id: church._id, localLeadership: church.localLeadership, councils: church.councils });
  return res.status(201).json(populated);
}

async function renewPastorTerm(req, res) {
  const row = await PastorTerm.findById(req.params.termId);
  if (!row) return res.status(404).json({ message: 'Pastor assignment not found' });
  const isSuper = req.user.role === 'SUPERADMIN';
  if (!isSuper && String(row.church) !== churchId(req)) return res.status(403).json({ message: 'Not allowed' });

  refreshStatus(row);
  if (row.status === 'TRANSFER_REQUIRED' || row.termNumber >= MAX_TERMS) {
    return res.status(400).json({ message: 'Maximum 8 years reached. Pastor must be transferred.' });
  }
  row.termNumber += 1;
  row.termEnd = addYears(row.termEnd, TERM_YEARS);
  row.status = 'RENEWED';
  row.renewalHistory.push({ renewedAt: new Date(), renewedBy: req.user._id });
  await row.save();
  const populated = await PastorTerm.findById(row._id).populate('pastor', 'fullName email memberId').populate('church', 'name');
  return res.json(populated);
}

async function transferPastor(req, res) {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Only superadmin can transfer pastors' });
  const row = await PastorTerm.findById(req.params.termId);
  if (!row) return res.status(404).json({ message: 'Pastor assignment not found' });
  const toChurchId = String(req.body.toChurchId || '');
  if (!toChurchId) return res.status(400).json({ message: 'toChurchId is required' });
  if (String(row.church) === toChurchId) return res.status(400).json({ message: 'Target church must be different' });

  const targetChurch = await Church.findOne({ _id: toChurchId, isActive: true }).select('_id');
  if (!targetChurch) return res.status(400).json({ message: 'Target church not found or inactive' });
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
  pastor.church = targetChurch._id;
  await pastor.save();

  row.status = 'TRANSFERRED';
  row.transferredToChurch = targetChurch._id;
  await row.save();

  const start = new Date();
  const next = await PastorTerm.create({
    pastor: pastor._id,
    church: targetChurch._id,
    assignedBy: req.user._id,
    termNumber: 1,
    termStart: start,
    termEnd: addYears(start, TERM_YEARS),
    status: 'ASSIGNED',
  });
  const populated = await PastorTerm.findById(next._id).populate('pastor', 'fullName email memberId').populate('church', 'name');
  const fromChurchDoc = await Church.findById(row.church).select('_id localLeadership councils');
  if (fromChurchDoc) await syncChurchMemberRoleDisplays(fromChurchDoc.toObject ? fromChurchDoc.toObject() : fromChurchDoc);
  if (targetChurchDoc) await syncChurchMemberRoleDisplays(targetChurchDoc.toObject ? targetChurchDoc.toObject() : targetChurchDoc);
  return res.status(201).json(populated);
}

module.exports = {
  listPastors,
  listEligibleMembers,
  createPastor,
  listEligibleMembersForSuperadmin,
  createPastorForSuperadmin,
  listPastorsForSuperadmin,
  listAdminPastorTerms,
  listSuperadminPastorTerms,
  assignPastorTerm,
  renewPastorTerm,
  transferPastor,
};

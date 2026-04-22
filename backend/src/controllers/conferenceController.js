const Conference = require('../models/Conference');
const Church = require('../models/Church');
const User = require('../models/User');
const PastorTerm = require('../models/PastorTerm');
const { ACTIVE_PASTOR_TERM_STATUSES } = require('../utils/memberRoleSync');

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

const CONFERENCE_LEADERSHIP_POPULATE = CONFERENCE_LEADERSHIP_KEYS.map((key) => ({
  path: `localLeadership.${key}`,
  select: 'email fullName firstName surname memberId',
}));

function toIdOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim();
}

function normalizeConferenceLeadership(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const key of CONFERENCE_LEADERSHIP_KEYS) {
    out[key] = toIdOrNull(src[key]);
  }
  return out;
}

async function validateConferenceLeadership(conferenceId, leadershipInput) {
  const leadership = normalizeConferenceLeadership(leadershipInput);
  const allIds = CONFERENCE_LEADERSHIP_KEYS.map((k) => leadership[k]).filter(Boolean);
  const counts = new Map();
  for (const id of allIds) counts.set(id, (counts.get(id) || 0) + 1);
  const hasDupes = [...counts.values()].some((v) => v > 1);
  if (hasDupes) {
    const e = new Error('A member can hold only one conference leadership role at a time');
    e.statusCode = 400;
    throw e;
  }
  if (allIds.length === 0) return leadership;
  const conferenceChurchIds = await Church.find({ conference: conferenceId }).distinct('_id');
  const validCount = await User.countDocuments({
    _id: { $in: allIds },
    role: 'MEMBER',
    church: { $in: conferenceChurchIds },
  });
  if (validCount !== allIds.length) {
    const e = new Error('Conference leaders must be members within this conference');
    e.statusCode = 400;
    throw e;
  }

  const ministerIds = [leadership.conferenceMinister1, leadership.conferenceMinister2]
    .filter(Boolean)
    .map(String);
  if (ministerIds.length > 0) {
    const pastorTerms = await PastorTerm.find({
      church: { $in: conferenceChurchIds },
      status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
      pastor: { $in: ministerIds },
    })
      .select('pastor')
      .lean();
    const spiritualSet = new Set(pastorTerms.map((t) => String(t.pastor)));
    if (ministerIds.some((id) => !spiritualSet.has(id))) {
      const e = new Error('Conference minister roles can only be assigned to Spiritual leader/Pastor members');
      e.statusCode = 400;
      throw e;
    }
  }
  return leadership;
}

async function generateConferenceId() {
  const year = new Date().getFullYear();
  const base = `CONF-${year}-`;
  for (let i = 1; i < 100000; i += 1) {
    const candidate = `${base}${String(i).padStart(4, '0')}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Conference.findOne({ conferenceId: candidate }).select('_id');
    if (!exists) return candidate;
  }
  return `CONF-${year}-${Date.now()}`;
}

async function listConferences(_req, res) {
  const rows = await Conference.find({}).populate(CONFERENCE_LEADERSHIP_POPULATE).sort({ name: 1 });
  return res.json(rows);
}

async function getConference(req, res) {
  const row = await Conference.findById(req.params.conferenceId).populate(CONFERENCE_LEADERSHIP_POPULATE);
  if (!row) return res.status(404).json({ message: 'Conference not found' });
  return res.json(row);
}

async function createConference(req, res) {
  const {
    name,
    description,
    email,
    phone,
    officeAddress,
    city,
    stateOrProvince,
    postalCode,
    country,
    contactPerson,
    isActive,
  } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });
  let row = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const conferenceId = await generateConferenceId();
    try {
      // Retry if generated code collides due to concurrent request.
      // eslint-disable-next-line no-await-in-loop
      row = await Conference.create({
        name: String(name).trim(),
        conferenceId,
        description: String(description || '').trim(),
        email: String(email || '').trim(),
        phone: String(phone || '').trim(),
        officeAddress: String(officeAddress || '').trim(),
        city: String(city || '').trim(),
        stateOrProvince: String(stateOrProvince || '').trim(),
        postalCode: String(postalCode || '').trim(),
        country: String(country || '').trim(),
        contactPerson: String(contactPerson || '').trim(),
        localLeadership: normalizeConferenceLeadership(req.body.localLeadership),
        isActive: isActive !== false,
      });
      break;
    } catch (e) {
      if (!(e && typeof e === 'object' && e.code === 11000)) throw e;
    }
  }
  if (!row) {
    return res.status(409).json({ message: 'Could not generate a unique conference code, please try again' });
  }
  return res.status(201).json(await Conference.findById(row._id).populate(CONFERENCE_LEADERSHIP_POPULATE));
}

async function updateConference(req, res) {
  const row = await Conference.findById(req.params.conferenceId);
  if (!row) return res.status(404).json({ message: 'Conference not found' });
  [
    'name',
    'description',
    'email',
    'phone',
    'officeAddress',
    'city',
    'stateOrProvince',
    'postalCode',
    'country',
    'contactPerson',
    'isActive',
  ].forEach((k) => {
    if (req.body[k] !== undefined) row[k] = req.body[k];
  });
  if (req.body.localLeadership !== undefined) {
    try {
      row.localLeadership = await validateConferenceLeadership(row._id, req.body.localLeadership);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid conference leadership data' });
    }
  }
  await row.save();
  return res.json(await Conference.findById(row._id).populate(CONFERENCE_LEADERSHIP_POPULATE));
}

async function removeConference(req, res) {
  const row = await Conference.findById(req.params.conferenceId).select('_id');
  if (!row) return res.status(404).json({ message: 'Conference not found' });
  const linkedChurches = await Church.countDocuments({ conference: row._id });
  if (linkedChurches > 0) {
    return res.status(400).json({
      message: 'Conference is linked to churches. Move churches to another conference first.',
    });
  }
  await Conference.findByIdAndDelete(row._id);
  return res.status(204).send();
}

async function listPublicConferences(_req, res) {
  const rows = await Conference.find({ isActive: true }).sort({ name: 1 });
  return res.json(rows);
}

module.exports = {
  listConferences,
  getConference,
  createConference,
  updateConference,
  removeConference,
  listPublicConferences,
};

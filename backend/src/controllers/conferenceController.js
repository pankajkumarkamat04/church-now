const Conference = require('../models/Conference');
const ChurchGroup = require('../models/ChurchGroup');
const Council = require('../models/Council');
const User = require('../models/User');

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

async function normalizeLeadershipIds(leadership) {
  const normalized = {
    churchBishop: leadership?.churchBishop || null,
    moderator: leadership?.moderator || null,
    secretary: leadership?.secretary || null,
    treasurer: leadership?.treasurer || null,
    superintendents: Array.isArray(leadership?.superintendents)
      ? leadership.superintendents.filter(Boolean)
      : [],
    president: leadership?.president || null,
  };

  const ids = [
    normalized.churchBishop,
    normalized.moderator,
    normalized.secretary,
    normalized.treasurer,
    normalized.president,
    ...normalized.superintendents,
  ].filter(Boolean);

  if (ids.length === 0) return normalized;
  const users = await User.find({ _id: { $in: ids } }).select('_id');
  if (users.length !== new Set(ids.map(String)).size) {
    throw new Error('One or more selected leadership users are invalid');
  }
  return normalized;
}

async function listConferences(_req, res) {
  const rows = await Conference.find({})
    .populate('leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents', 'fullName email')
    .sort({ name: 1 });
  return res.json(rows);
}

async function getConference(req, res) {
  const row = await Conference.findById(req.params.conferenceId).populate(
    'leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents',
    'fullName email'
  );
  if (!row) return res.status(404).json({ message: 'Conference not found' });
  return res.json(row);
}

async function createConference(req, res) {
  const {
    name,
    description,
    email,
    phone,
    website,
    officeAddress,
    city,
    stateOrProvince,
    postalCode,
    country,
    contactPerson,
    leadership,
    isActive,
  } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });
  const conferenceId = await generateConferenceId();
  let normalizedLeadership;
  try {
    normalizedLeadership = await normalizeLeadershipIds(leadership);
  } catch (e) {
    return res.status(400).json({ message: e instanceof Error ? e.message : 'Invalid leadership users' });
  }
  const row = await Conference.create({
    name: String(name).trim(),
    conferenceId,
    description: String(description || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    website: String(website || '').trim(),
    officeAddress: String(officeAddress || '').trim(),
    city: String(city || '').trim(),
    stateOrProvince: String(stateOrProvince || '').trim(),
    postalCode: String(postalCode || '').trim(),
    country: String(country || '').trim(),
    contactPerson: String(contactPerson || '').trim(),
    leadership: normalizedLeadership,
    isActive: isActive !== false,
  });
  const populated = await Conference.findById(row._id).populate(
    'leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents',
    'fullName email'
  );
  return res.status(201).json(populated);
}

async function updateConference(req, res) {
  const row = await Conference.findById(req.params.conferenceId);
  if (!row) return res.status(404).json({ message: 'Conference not found' });
  [
    'name',
    'description',
    'email',
    'phone',
    'website',
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
  if (req.body.leadership !== undefined) {
    try {
      row.leadership = await normalizeLeadershipIds(req.body.leadership);
    } catch (e) {
      return res.status(400).json({ message: e instanceof Error ? e.message : 'Invalid leadership users' });
    }
  }
  await row.save();
  const populated = await Conference.findById(row._id).populate(
    'leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents',
    'fullName email'
  );
  return res.json(populated);
}

async function removeConference(req, res) {
  const row = await Conference.findByIdAndDelete(req.params.conferenceId);
  if (!row) return res.status(404).json({ message: 'Conference not found' });
  await ChurchGroup.deleteMany({ conference: row._id });
  await Council.deleteMany({ conference: row._id });
  return res.status(204).send();
}

async function listGroups(req, res) {
  const filter = req.params.conferenceId
    ? { conference: req.params.conferenceId }
    : req.query.conferenceId
      ? { conference: req.query.conferenceId }
      : {};
  const rows = await ChurchGroup.find(filter).sort({ name: 1 });
  return res.json(rows);
}

async function createGroup(req, res) {
  const { name, description, isActive } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });
  const row = await ChurchGroup.create({
    conference: req.params.conferenceId,
    name: String(name).trim(),
    description: String(description || '').trim(),
    isActive: isActive !== false,
  });
  return res.status(201).json(row);
}

async function updateGroup(req, res) {
  const row = await ChurchGroup.findById(req.params.groupId);
  if (!row) return res.status(404).json({ message: 'Group not found' });
  ['name', 'description', 'isActive'].forEach((k) => {
    if (req.body[k] !== undefined) row[k] = req.body[k];
  });
  await row.save();
  return res.json(row);
}

async function removeGroup(req, res) {
  const row = await ChurchGroup.findByIdAndDelete(req.params.groupId);
  if (!row) return res.status(404).json({ message: 'Group not found' });
  return res.status(204).send();
}

async function listCouncils(req, res) {
  const filter = req.params.conferenceId
    ? { conference: req.params.conferenceId }
    : req.query.conferenceId
      ? { conference: req.query.conferenceId }
      : {};
  const rows = await Council.find(filter).sort({ name: 1 });
  return res.json(rows);
}

async function createCouncil(req, res) {
  const { name, description, isActive, leadership } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });
  const normalizedLeadership = {
    churchBishop: String(leadership?.churchBishop || '').trim(),
    moderator: String(leadership?.moderator || '').trim(),
    secretary: String(leadership?.secretary || '').trim(),
    treasurer: String(leadership?.treasurer || '').trim(),
    superintendents: Array.isArray(leadership?.superintendents)
      ? leadership.superintendents.map((s) => String(s || '').trim()).filter(Boolean)
      : [],
    president: String(leadership?.president || '').trim(),
  };
  const row = await Council.create({
    conference: req.params.conferenceId,
    name: String(name).trim(),
    description: String(description || '').trim(),
    leadership: normalizedLeadership,
    isActive: isActive !== false,
  });
  return res.status(201).json(row);
}

async function updateCouncil(req, res) {
  const row = await Council.findById(req.params.councilId);
  if (!row) return res.status(404).json({ message: 'Council not found' });
  ['name', 'description', 'isActive'].forEach((k) => {
    if (req.body[k] !== undefined) row[k] = req.body[k];
  });
  if (req.body.leadership !== undefined && req.body.leadership && typeof req.body.leadership === 'object') {
    const current = row.leadership || {};
    const incoming = req.body.leadership;
    row.leadership = {
      churchBishop:
        incoming.churchBishop !== undefined
          ? String(incoming.churchBishop || '').trim()
          : String(current.churchBishop || '').trim(),
      moderator:
        incoming.moderator !== undefined
          ? String(incoming.moderator || '').trim()
          : String(current.moderator || '').trim(),
      secretary:
        incoming.secretary !== undefined
          ? String(incoming.secretary || '').trim()
          : String(current.secretary || '').trim(),
      treasurer:
        incoming.treasurer !== undefined
          ? String(incoming.treasurer || '').trim()
          : String(current.treasurer || '').trim(),
      superintendents:
        incoming.superintendents !== undefined
          ? Array.isArray(incoming.superintendents)
            ? incoming.superintendents.map((s) => String(s || '').trim()).filter(Boolean)
            : []
          : Array.isArray(current.superintendents)
            ? current.superintendents.map((s) => String(s || '').trim()).filter(Boolean)
            : [],
      president:
        incoming.president !== undefined
          ? String(incoming.president || '').trim()
          : String(current.president || '').trim(),
    };
  }
  await row.save();
  return res.json(row);
}

async function removeCouncil(req, res) {
  const row = await Council.findByIdAndDelete(req.params.councilId);
  if (!row) return res.status(404).json({ message: 'Council not found' });
  return res.status(204).send();
}

async function listPublicConferences(_req, res) {
  const rows = await Conference.find({ isActive: true }).sort({ name: 1 });
  return res.json(rows);
}

async function listPublicGroups(req, res) {
  const rows = await ChurchGroup.find({ conference: req.params.conferenceId, isActive: true }).sort({
    name: 1,
  });
  return res.json(rows);
}

async function listPublicCouncils(req, res) {
  const rows = await Council.find({ conference: req.params.conferenceId, isActive: true }).sort({
    name: 1,
  });
  return res.json(rows);
}

module.exports = {
  listConferences,
  getConference,
  createConference,
  updateConference,
  removeConference,
  listGroups,
  createGroup,
  updateGroup,
  removeGroup,
  listCouncils,
  createCouncil,
  updateCouncil,
  removeCouncil,
  listPublicConferences,
  listPublicGroups,
  listPublicCouncils,
};

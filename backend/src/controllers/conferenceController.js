const Conference = require('../models/Conference');
const User = require('../models/User');
const Church = require('../models/Church');

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
  let normalizedLeadership;
  try {
    normalizedLeadership = await normalizeLeadershipIds(leadership);
  } catch (e) {
    return res.status(400).json({ message: e instanceof Error ? e.message : 'Invalid leadership users' });
  }
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
        leadership: normalizedLeadership,
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

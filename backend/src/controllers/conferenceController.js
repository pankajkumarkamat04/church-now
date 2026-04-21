const Conference = require('../models/Conference');
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

async function listConferences(_req, res) {
  const rows = await Conference.find({}).sort({ name: 1 });
  return res.json(rows);
}

async function getConference(req, res) {
  const row = await Conference.findById(req.params.conferenceId);
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
  return res.status(201).json(await Conference.findById(row._id));
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
  await row.save();
  // Drop legacy subdocument if present in the database
  await Conference.updateOne({ _id: row._id }, { $unset: { leadership: 1 } });
  return res.json(await Conference.findById(row._id));
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

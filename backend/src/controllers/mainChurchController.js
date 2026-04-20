const Church = require('../models/Church');
const { removeChurchWithDependencies } = require('./churchManagementUtils');
const {
  validateChurchLeadershipPayload,
  populateLeadershipPaths,
} = require('../utils/churchLeadershipValidation');

const BASE_FIELDS = [
  'name',
  'address',
  'city',
  'stateOrProvince',
  'postalCode',
  'country',
  'phone',
  'email',
  'contactPerson',
  'latitude',
  'longitude',
  'isActive',
];

function buildBasePayload(body) {
  const payload = {};
  for (const key of BASE_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  return payload;
}

async function listMainChurches(req, res) {
  const rows = await Church.find({ churchType: 'MAIN' })
    .populate(populateLeadershipPaths)
    .sort({ name: 1 });
  return res.json(rows);
}

async function getMainChurch(req, res) {
  const row = await Church.findOne({ _id: req.params.id, churchType: 'MAIN' }).populate(
    populateLeadershipPaths
  );
  if (!row) return res.status(404).json({ message: 'Main church not found' });
  return res.json(row);
}

async function createMainChurch(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Church name is required' });
  const existingMain = await Church.findOne({ churchType: 'MAIN' }).select('_id');
  if (existingMain) {
    return res.status(400).json({ message: 'Only one main church is allowed' });
  }

  const row = await Church.create({
    ...buildBasePayload(req.body),
    name: String(name).trim(),
    conference: null,
    churchType: 'MAIN',
    mainChurch: null,
  });
  return res.status(201).json(row);
}

async function updateMainChurch(req, res) {
  const row = await Church.findOne({ _id: req.params.id, churchType: 'MAIN' });
  if (!row) return res.status(404).json({ message: 'Main church not found' });

  Object.assign(row, buildBasePayload(req.body));
  row.conference = null;
  row.mainChurch = null;

  if (req.body.localLeadership !== undefined || req.body.councils !== undefined) {
    try {
      const leadershipSrc =
        req.body.localLeadership !== undefined
          ? req.body.localLeadership
          : row.localLeadership?.toObject?.() || row.localLeadership || {};
      const councilsSrc =
        req.body.councils !== undefined ? req.body.councils : row.councils?.toObject?.() || row.councils || [];
      const { leadership, councils } = await validateChurchLeadershipPayload(row._id, leadershipSrc, councilsSrc);
      row.localLeadership = leadership;
      row.councils = councils;
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid leadership data' });
    }
  }

  await row.save();
  const populated = await Church.findById(row._id).populate(populateLeadershipPaths);
  return res.json(populated);
}

async function deleteMainChurch(req, res) {
  const row = await Church.findOne({ _id: req.params.id, churchType: 'MAIN' }).select('_id');
  if (!row) return res.status(404).json({ message: 'Main church not found' });

  const subChurchCount = await Church.countDocuments({ mainChurch: row._id, churchType: 'SUB' });
  if (subChurchCount > 0) {
    return res.status(400).json({
      message: 'Delete or move sub churches linked to this main church before deleting it',
    });
  }

  try {
    await removeChurchWithDependencies(row._id);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message || 'Failed to delete church' });
  }

  await Church.findByIdAndDelete(row._id);
  return res.status(204).send();
}

module.exports = {
  listMainChurches,
  getMainChurch,
  createMainChurch,
  updateMainChurch,
  deleteMainChurch,
};

const Church = require('../models/Church');
const {
  validateConferenceOrThrow,
  validateMainChurchOrThrow,
  removeChurchWithDependencies,
} = require('./churchManagementUtils');
const {
  validateChurchLeadershipPayload,
  populateLeadershipPaths,
} = require('../utils/churchLeadershipValidation');
const { syncChurchMemberRoleDisplays } = require('../utils/memberRoleSync');
const { enrichChurchRowsForLocalMinisterList } = require('../utils/churchListLocalMinister');

const BASE_FIELDS = [
  'name',
  'address',
  'city',
  'stateOrProvince',
  'postalCode',
  'country',
  'phone',
  'email',
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

async function listSubChurches(req, res) {
  const filter = { churchType: 'SUB' };
  if (req.query.conferenceId) filter.conference = req.query.conferenceId;
  if (req.query.mainChurchId) filter.mainChurch = req.query.mainChurchId;
  const rows = await Church.find(filter)
    .populate('conference', 'name conferenceId')
    .populate('mainChurch', 'name')
    .populate(populateLeadershipPaths)
    .sort({ name: 1 })
    .lean();
  const enriched = await enrichChurchRowsForLocalMinisterList(rows);
  return res.json(enriched);
}

async function getSubChurch(req, res) {
  const row = await Church.findOne({ _id: req.params.id, churchType: 'SUB' })
    .populate('conference', 'name conferenceId')
    .populate('mainChurch', 'name')
    .populate(populateLeadershipPaths);
  if (!row) return res.status(404).json({ message: 'Sub church not found' });
  return res.json(row);
}

async function createSubChurch(req, res) {
  const { name, conferenceId, mainChurchId } = req.body;
  if (!name) return res.status(400).json({ message: 'Church name is required' });
  if (!conferenceId) return res.status(400).json({ message: 'conferenceId is required' });

  const fallbackMain = await Church.findOne({ churchType: 'MAIN' }).select('_id');
  if (!fallbackMain) {
    return res.status(400).json({ message: 'Create a main church first' });
  }
  const resolvedMainChurchId = mainChurchId || String(fallbackMain._id);
  let mainChurch;
  try {
    await validateConferenceOrThrow(conferenceId);
    mainChurch = await validateMainChurchOrThrow(resolvedMainChurchId);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid church links' });
  }

  const row = await Church.create({
    ...buildBasePayload(req.body),
    name: String(name).trim(),
    conference: conferenceId,
    mainChurch: mainChurch._id,
    churchType: 'SUB',
  });

  const populated = await Church.findById(row._id)
    .populate('conference', 'name conferenceId')
    .populate('mainChurch', 'name')
    .populate(populateLeadershipPaths);
  return res.status(201).json(populated);
}

async function updateSubChurch(req, res) {
  const row = await Church.findOne({ _id: req.params.id, churchType: 'SUB' });
  if (!row) return res.status(404).json({ message: 'Sub church not found' });

  Object.assign(row, buildBasePayload(req.body));

  const nextConference = req.body.conferenceId !== undefined ? req.body.conferenceId : row.conference;
  const fallbackMain = await Church.findOne({ churchType: 'MAIN' }).select('_id');
  if (!fallbackMain) {
    return res.status(400).json({ message: 'Create a main church first' });
  }
  const nextMainChurch =
    req.body.mainChurchId !== undefined
      ? req.body.mainChurchId || String(fallbackMain._id)
      : row.mainChurch || fallbackMain._id;

  if (!nextConference) return res.status(400).json({ message: 'conferenceId is required' });

  let mainChurch;
  try {
    await validateConferenceOrThrow(nextConference);
    mainChurch = await validateMainChurchOrThrow(nextMainChurch);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid church links' });
  }

  row.conference = nextConference;
  row.mainChurch = mainChurch._id;

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
  await syncChurchMemberRoleDisplays(row.toObject ? row.toObject() : row);
  const populated = await Church.findById(row._id)
    .populate('conference', 'name conferenceId')
    .populate('mainChurch', 'name')
    .populate(populateLeadershipPaths);
  return res.json(populated);
}

async function deleteSubChurch(req, res) {
  const row = await Church.findOne({ _id: req.params.id, churchType: 'SUB' }).select('_id');
  if (!row) return res.status(404).json({ message: 'Sub church not found' });

  try {
    await removeChurchWithDependencies(row._id);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message || 'Failed to delete church' });
  }

  await Church.findByIdAndDelete(row._id);
  return res.status(204).send();
}

module.exports = {
  listSubChurches,
  getSubChurch,
  createSubChurch,
  updateSubChurch,
  deleteSubChurch,
};

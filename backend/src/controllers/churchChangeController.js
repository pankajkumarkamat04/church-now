const Church = require('../models/Church');
const User = require('../models/User');
const ChurchChangeRequest = require('../models/ChurchChangeRequest');
const Conference = require('../models/Conference');

async function listMyChurchChangeRequests(req, res) {
  const rows = await ChurchChangeRequest.find({ user: req.user._id })
    .populate('fromChurch', 'name')
    .populate('toChurch', 'name')
    .populate('reviewedBy', 'fullName email')
    .sort({ createdAt: -1 });
  return res.json(rows);
}

async function createChurchChangeRequest(req, res) {
  const { toChurchId, toConferenceId, reason } = req.body;
  if (!toChurchId) {
    return res.status(400).json({ message: 'Target church is required' });
  }
  if (!toConferenceId) {
    return res.status(400).json({ message: 'Target conference is required' });
  }
  const me = await User.findById(req.user._id);
  if (!me || !me.church) {
    return res.status(400).json({ message: 'Current church assignment not found' });
  }
  if (String(me.church) === String(toChurchId)) {
    return res.status(400).json({ message: 'You already belong to this church' });
  }
  const conference = await Conference.findOne({ _id: toConferenceId, isActive: true }).select('_id');
  if (!conference) {
    return res.status(400).json({ message: 'Selected conference not found or inactive' });
  }
  const target = await Church.findOne({
    _id: toChurchId,
    isActive: true,
    conference: conference._id,
    churchType: 'SUB',
  }).select('_id');
  if (!target) {
    return res.status(400).json({ message: 'Selected church was not found in the selected conference' });
  }
  const existingPending = await ChurchChangeRequest.findOne({
    user: me._id,
    status: 'PENDING',
  }).select('_id');
  if (existingPending) {
    return res.status(409).json({ message: 'You already have a pending church change request' });
  }
  const row = await ChurchChangeRequest.create({
    user: me._id,
    fromChurch: me.church,
    toChurch: toChurchId,
    reason: String(reason || '').trim(),
    status: 'PENDING',
  });
  const populated = await ChurchChangeRequest.findById(row._id)
    .populate('fromChurch', 'name')
    .populate('toChurch', 'name');
  return res.status(201).json(populated);
}

async function listSuperadminChurchChangeRequests(req, res) {
  const status = req.query.status ? String(req.query.status).toUpperCase() : '';
  const filter = {};
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    filter.status = status;
  }
  const rows = await ChurchChangeRequest.find(filter)
    .populate('user', 'fullName email')
    .populate('fromChurch', 'name')
    .populate('toChurch', 'name')
    .populate('reviewedBy', 'fullName email')
    .sort({ createdAt: -1 });
  return res.json(rows);
}

async function decideChurchChangeRequest(req, res) {
  const { action, reviewNote } = req.body;
  if (!['APPROVE', 'REJECT'].includes(String(action || ''))) {
    return res.status(400).json({ message: 'action must be APPROVE or REJECT' });
  }
  const row = await ChurchChangeRequest.findById(req.params.requestId);
  if (!row) {
    return res.status(404).json({ message: 'Request not found' });
  }
  if (row.status !== 'PENDING') {
    return res.status(400).json({ message: 'Request is already reviewed' });
  }

  if (action === 'APPROVE') {
    const target = await Church.findOne({ _id: row.toChurch, isActive: true }).select('_id conference');
    if (!target) {
      return res.status(400).json({ message: 'Target church is no longer active' });
    }
    if (!target.conference) {
      return res.status(400).json({ message: 'Target church is missing conference assignment' });
    }
    await User.findByIdAndUpdate(row.user, {
      $set: {
        church: row.toChurch,
        conferences: [target.conference],
      },
    });
    row.status = 'APPROVED';
  } else {
    row.status = 'REJECTED';
  }

  row.reviewedBy = req.user._id;
  row.reviewedAt = new Date();
  row.reviewNote = String(reviewNote || '').trim();
  await row.save();

  const populated = await ChurchChangeRequest.findById(row._id)
    .populate('user', 'fullName email')
    .populate('fromChurch', 'name')
    .populate('toChurch', 'name')
    .populate('reviewedBy', 'fullName email');
  return res.json(populated);
}

module.exports = {
  listMyChurchChangeRequests,
  createChurchChangeRequest,
  listSuperadminChurchChangeRequests,
  decideChurchChangeRequest,
};

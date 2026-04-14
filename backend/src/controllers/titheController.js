const TithePayment = require('../models/TithePayment');
const User = require('../models/User');

function churchId(req) {
  return req.user?.church;
}

function normalizeMonthKey(monthKey, paidAt) {
  if (monthKey) return String(monthKey).slice(0, 7);
  const d = paidAt ? new Date(paidAt) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function listMemberTithes(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await TithePayment.find({ church: cid, user: req.user._id }).sort({ monthKey: -1 });
  return res.json(rows);
}

async function payMemberTithe(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { amount, currency, monthKey, note, paidAt } = req.body;
  if (amount === undefined) return res.status(400).json({ message: 'amount is required' });
  const mk = normalizeMonthKey(monthKey, paidAt);
  const row = await TithePayment.create({
    church: cid,
    user: req.user._id,
    amount: Number(amount),
    currency: String(currency || 'USD').toUpperCase(),
    monthKey: mk,
    note: String(note || '').trim(),
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    createdBy: req.user._id,
  });
  return res.status(201).json(row);
}

async function listAdminTithes(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await TithePayment.find({ church: cid })
    .populate('user', 'fullName email')
    .sort({ monthKey: -1, createdAt: -1 });
  return res.json(rows);
}

async function createAdminTithe(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { userId, amount, currency, monthKey, note, paidAt } = req.body;
  if (!userId || amount === undefined) {
    return res.status(400).json({ message: 'userId and amount are required' });
  }
  const member = await User.findOne({ _id: userId, church: cid, role: 'MEMBER' }).select('_id');
  if (!member) return res.status(404).json({ message: 'Member not found in your church' });
  const mk = normalizeMonthKey(monthKey, paidAt);
  const row = await TithePayment.create({
    church: cid,
    user: userId,
    amount: Number(amount),
    currency: String(currency || 'USD').toUpperCase(),
    monthKey: mk,
    note: String(note || '').trim(),
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    createdBy: req.user._id,
  });
  const populated = await TithePayment.findById(row._id).populate('user', 'fullName email');
  return res.status(201).json(populated);
}

async function updateAdminTithe(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await TithePayment.findOne({ _id: req.params.titheId, church: cid });
  if (!row) return res.status(404).json({ message: 'Tithe payment not found' });
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.monthKey !== undefined) row.monthKey = normalizeMonthKey(req.body.monthKey);
  if (req.body.note !== undefined) row.note = String(req.body.note || '').trim();
  if (req.body.paidAt !== undefined) row.paidAt = new Date(req.body.paidAt);
  await row.save();
  const populated = await TithePayment.findById(row._id).populate('user', 'fullName email');
  return res.json(populated);
}

async function removeAdminTithe(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await TithePayment.findOneAndDelete({ _id: req.params.titheId, church: cid });
  if (!row) return res.status(404).json({ message: 'Tithe payment not found' });
  return res.status(204).send();
}

async function listSuperadminTithes(_req, res) {
  const rows = await TithePayment.find({})
    .populate('church', 'name slug')
    .populate('user', 'fullName email')
    .sort({ monthKey: -1, createdAt: -1 });
  return res.json(rows);
}

async function createSuperadminTithe(req, res) {
  const { churchId: cid, userId, amount, currency, monthKey, note, paidAt } = req.body;
  if (!cid || !userId || amount === undefined) {
    return res.status(400).json({ message: 'churchId, userId and amount are required' });
  }
  const member = await User.findOne({ _id: userId, church: cid, role: 'MEMBER' }).select('_id');
  if (!member) return res.status(404).json({ message: 'Member not found in selected church' });
  const mk = normalizeMonthKey(monthKey, paidAt);
  const row = await TithePayment.create({
    church: cid,
    user: userId,
    amount: Number(amount),
    currency: String(currency || 'USD').toUpperCase(),
    monthKey: mk,
    note: String(note || '').trim(),
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    createdBy: req.user._id,
  });
  const populated = await TithePayment.findById(row._id)
    .populate('church', 'name slug')
    .populate('user', 'fullName email');
  return res.status(201).json(populated);
}

async function updateSuperadminTithe(req, res) {
  const row = await TithePayment.findById(req.params.titheId);
  if (!row) return res.status(404).json({ message: 'Tithe payment not found' });
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.monthKey !== undefined) row.monthKey = normalizeMonthKey(req.body.monthKey);
  if (req.body.note !== undefined) row.note = String(req.body.note || '').trim();
  if (req.body.paidAt !== undefined) row.paidAt = new Date(req.body.paidAt);
  await row.save();
  const populated = await TithePayment.findById(row._id)
    .populate('church', 'name slug')
    .populate('user', 'fullName email');
  return res.json(populated);
}

async function removeSuperadminTithe(req, res) {
  const row = await TithePayment.findByIdAndDelete(req.params.titheId);
  if (!row) return res.status(404).json({ message: 'Tithe payment not found' });
  return res.status(204).send();
}

module.exports = {
  listMemberTithes,
  payMemberTithe,
  listAdminTithes,
  createAdminTithe,
  updateAdminTithe,
  removeAdminTithe,
  listSuperadminTithes,
  createSuperadminTithe,
  updateSuperadminTithe,
  removeSuperadminTithe,
};

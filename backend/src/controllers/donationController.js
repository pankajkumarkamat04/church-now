const Donation = require('../models/Donation');
const User = require('../models/User');
const Church = require('../models/Church');

function churchId(req) {
  return req.user?.church;
}

async function listMemberDonations(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await Donation.find({ church: cid, user: req.user._id }).sort({ donatedAt: -1, createdAt: -1 });
  return res.json(rows);
}

async function donateAsMember(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { amount, currency, note } = req.body;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }
  const row = await Donation.create({
    church: cid,
    user: req.user._id,
    donorName: req.user.fullName || '',
    donorEmail: req.user.email || '',
    amount: numericAmount,
    currency: String(currency || 'USD').toUpperCase(),
    note: String(note || '').trim(),
    donatedAt: new Date(),
    source: 'MEMBER',
  });
  return res.status(201).json(row);
}

async function listAdminDonations(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await Donation.find({ church: cid })
    .populate('user', 'fullName email')
    .sort({ donatedAt: -1, createdAt: -1 });
  return res.json(rows);
}

async function listSuperadminDonations(_req, res) {
  const rows = await Donation.find({})
    .populate('church', 'name')
    .populate('user', 'fullName email')
    .sort({ donatedAt: -1, createdAt: -1 });
  return res.json(rows);
}

async function donatePublic(req, res) {
  const { churchId: cid, amount, currency, note, donorName, donorEmail, donorPhone } = req.body;
  if (!cid) return res.status(400).json({ message: 'churchId is required' });
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }
  const church = await Church.findOne({ _id: cid, isActive: true }).select('_id');
  if (!church) return res.status(404).json({ message: 'Church not found' });
  let user = null;
  const normalizedEmail = String(donorEmail || '').trim().toLowerCase();
  if (normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail }).select('_id');
  }
  const row = await Donation.create({
    church: cid,
    user: user?._id || null,
    donorName: String(donorName || '').trim(),
    donorEmail: normalizedEmail,
    donorPhone: String(donorPhone || '').trim(),
    amount: numericAmount,
    currency: String(currency || 'USD').toUpperCase(),
    note: String(note || '').trim(),
    donatedAt: new Date(),
    source: 'PUBLIC',
  });
  return res.status(201).json(row);
}

module.exports = {
  listMemberDonations,
  donateAsMember,
  listAdminDonations,
  listSuperadminDonations,
  donatePublic,
};

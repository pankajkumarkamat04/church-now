const UserSubscription = require('../models/UserSubscription');

function churchId(req) {
  return req.user?.church;
}

function addOneMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function listChurchSubscriptions(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const subs = await UserSubscription.find({ church: cid })
    .populate('user', 'email fullName')
    .sort({ createdAt: -1 });
  return res.json(subs);
}

async function listSuperadminSubscriptions(req, res) {
  const subs = await UserSubscription.find({})
    .populate('church', 'name')
    .populate('user', 'email fullName')
    .sort({ createdAt: -1 });
  return res.json(subs);
}

async function getMySubscription(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const sub = await UserSubscription.findOne({
    user: req.user._id,
    church: cid,
    status: 'ACTIVE',
  });
  return res.json(sub);
}

/** All subscription payment rows for the current user in their church (active + past). */
async function listMySubscriptionHistory(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const subs = await UserSubscription.find({ user: req.user._id, church: cid })
    .sort({ startDate: -1, createdAt: -1 });
  return res.json(subs);
}

async function subscribeMember(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const amount = Number(req.body?.amount);
  const currency = String(req.body?.currency || 'USD').trim().toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'A valid amount is required' });
  }

  await UserSubscription.updateMany(
    { user: req.user._id, church: cid, status: 'ACTIVE' },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
  );

  const now = new Date();
  const subscription = await UserSubscription.create({
    user: req.user._id,
    church: cid,
    plan: null,
    status: 'ACTIVE',
    monthlyPrice: amount,
    currency: currency || 'USD',
    startDate: now,
    renewalDate: addOneMonth(now),
  });
  const populated = await UserSubscription.findById(subscription._id).populate(
    'church',
    'name'
  );
  return res.status(201).json(populated);
}

async function cancelMySubscription(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const active = await UserSubscription.findOne({
    user: req.user._id,
    church: cid,
    status: 'ACTIVE',
  });
  if (!active) return res.status(404).json({ message: 'No active subscription found' });
  active.status = 'CANCELLED';
  active.cancelledAt = new Date();
  await active.save();
  return res.json(active);
}

module.exports = {
  listChurchSubscriptions,
  listSuperadminSubscriptions,
  getMySubscription,
  listMySubscriptionHistory,
  subscribeMember,
  cancelMySubscription,
};

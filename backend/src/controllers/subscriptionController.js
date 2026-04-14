const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');

function churchId(req) {
  return req.user?.church;
}

function addOneMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function listAdminPlans(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const plans = await SubscriptionPlan.find({ church: cid }).sort({ createdAt: -1 });
  return res.json(plans);
}

async function createAdminPlan(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { name, description, monthlyPrice, currency, isActive } = req.body;
  if (!name || monthlyPrice === undefined) {
    return res.status(400).json({ message: 'name and monthlyPrice are required' });
  }
  const plan = await SubscriptionPlan.create({
    church: cid,
    name: String(name).trim(),
    description: String(description || '').trim(),
    monthlyPrice: Number(monthlyPrice),
    currency: String(currency || 'USD').toUpperCase(),
    isActive: isActive !== false,
  });
  return res.status(201).json(plan);
}

async function updateAdminPlan(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const plan = await SubscriptionPlan.findOne({ _id: req.params.planId, church: cid });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const fields = ['name', 'description', 'monthlyPrice', 'currency', 'isActive'];
  for (const key of fields) {
    if (req.body[key] !== undefined) {
      if (key === 'monthlyPrice') plan[key] = Number(req.body[key]);
      else if (key === 'currency') plan[key] = String(req.body[key]).toUpperCase();
      else plan[key] = req.body[key];
    }
  }
  await plan.save();
  return res.json(plan);
}

async function removeAdminPlan(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const plan = await SubscriptionPlan.findOneAndDelete({ _id: req.params.planId, church: cid });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  await UserSubscription.updateMany(
    { church: cid, plan: plan._id, status: 'ACTIVE' },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
  );
  return res.status(204).send();
}

async function listChurchSubscriptions(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const subs = await UserSubscription.find({ church: cid })
    .populate('user', 'email fullName')
    .populate('plan', 'name monthlyPrice currency')
    .sort({ createdAt: -1 });
  return res.json(subs);
}

async function listSuperadminPlans(req, res) {
  const plans = await SubscriptionPlan.find({})
    .populate('church', 'name slug')
    .sort({ createdAt: -1 });
  return res.json(plans);
}

async function getSuperadminPlan(req, res) {
  const plan = await SubscriptionPlan.findById(req.params.planId).populate('church', 'name slug');
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  return res.json(plan);
}

async function createSuperadminPlan(req, res) {
  const { churchId: targetChurchId, name, description, monthlyPrice, currency, isActive } = req.body;
  if (!targetChurchId || !name || monthlyPrice === undefined) {
    return res.status(400).json({ message: 'churchId, name and monthlyPrice are required' });
  }
  const plan = await SubscriptionPlan.create({
    church: targetChurchId,
    name: String(name).trim(),
    description: String(description || '').trim(),
    monthlyPrice: Number(monthlyPrice),
    currency: String(currency || 'USD').toUpperCase(),
    isActive: isActive !== false,
  });
  const populated = await SubscriptionPlan.findById(plan._id).populate('church', 'name slug');
  return res.status(201).json(populated);
}

async function updateSuperadminPlan(req, res) {
  const plan = await SubscriptionPlan.findById(req.params.planId);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  if (req.body.churchId !== undefined) plan.church = req.body.churchId;
  const fields = ['name', 'description', 'monthlyPrice', 'currency', 'isActive'];
  for (const key of fields) {
    if (req.body[key] !== undefined) {
      if (key === 'monthlyPrice') plan[key] = Number(req.body[key]);
      else if (key === 'currency') plan[key] = String(req.body[key]).toUpperCase();
      else plan[key] = req.body[key];
    }
  }
  await plan.save();
  const populated = await SubscriptionPlan.findById(plan._id).populate('church', 'name slug');
  return res.json(populated);
}

async function removeSuperadminPlan(req, res) {
  const plan = await SubscriptionPlan.findByIdAndDelete(req.params.planId);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  await UserSubscription.updateMany(
    { plan: plan._id, status: 'ACTIVE' },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
  );
  return res.status(204).send();
}

async function listSuperadminSubscriptions(req, res) {
  const subs = await UserSubscription.find({})
    .populate('church', 'name slug')
    .populate('user', 'email fullName')
    .populate('plan', 'name monthlyPrice currency')
    .sort({ createdAt: -1 });
  return res.json(subs);
}

async function listMemberPlans(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const plans = await SubscriptionPlan.find({ church: cid, isActive: true }).sort({ monthlyPrice: 1 });
  return res.json(plans);
}

async function getMySubscription(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const sub = await UserSubscription.findOne({
    user: req.user._id,
    church: cid,
    status: 'ACTIVE',
  }).populate('plan', 'name description monthlyPrice currency');
  return res.json(sub);
}

async function subscribeMember(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ message: 'planId is required' });

  const plan = await SubscriptionPlan.findOne({ _id: planId, church: cid, isActive: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  await UserSubscription.updateMany(
    { user: req.user._id, church: cid, status: 'ACTIVE' },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
  );

  const now = new Date();
  const subscription = await UserSubscription.create({
    user: req.user._id,
    church: cid,
    plan: plan._id,
    status: 'ACTIVE',
    monthlyPrice: plan.monthlyPrice,
    currency: plan.currency,
    startDate: now,
    renewalDate: addOneMonth(now),
  });
  const populated = await UserSubscription.findById(subscription._id).populate(
    'plan',
    'name description monthlyPrice currency'
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
  listAdminPlans,
  createAdminPlan,
  updateAdminPlan,
  removeAdminPlan,
  listChurchSubscriptions,
  listSuperadminPlans,
  getSuperadminPlan,
  createSuperadminPlan,
  updateSuperadminPlan,
  removeSuperadminPlan,
  listSuperadminSubscriptions,
  listMemberPlans,
  getMySubscription,
  subscribeMember,
  cancelMySubscription,
};

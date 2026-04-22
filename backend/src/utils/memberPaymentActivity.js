const TithePayment = require('../models/TithePayment');
const UserSubscription = require('../models/UserSubscription');

function recentThresholdDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
}

async function hasRecentTithePayment(userId, churchId, threshold) {
  const row = await TithePayment.findOne({
    user: userId,
    church: churchId,
    paidAt: { $gte: threshold },
  })
    .select('_id')
    .lean();
  return Boolean(row);
}

async function hasRecentSubscriptionPayment(userId, churchId, threshold) {
  const row = await UserSubscription.findOne({
    user: userId,
    church: churchId,
    startDate: { $gte: threshold },
  })
    .select('_id')
    .lean();
  return Boolean(row);
}

async function syncMemberActiveStatusByPayments(userDoc) {
  if (!userDoc || userDoc.role !== 'MEMBER' || !userDoc.church) return userDoc;
  const threshold = recentThresholdDate();
  const [hasRecentTithe, hasRecentSubscription] = await Promise.all([
    hasRecentTithePayment(userDoc._id, userDoc.church, threshold),
    hasRecentSubscriptionPayment(userDoc._id, userDoc.church, threshold),
  ]);
  const shouldBeActive = hasRecentTithe || hasRecentSubscription;
  if (userDoc.isActive !== shouldBeActive) {
    userDoc.isActive = shouldBeActive;
    await userDoc.save();
  }
  return userDoc;
}

module.exports = { syncMemberActiveStatusByPayments };

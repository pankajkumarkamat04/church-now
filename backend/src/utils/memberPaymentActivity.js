const { Payment } = require('../models/Payment');

function recentThresholdDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
}

function newMemberGraceThresholdDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
}

async function hasRecentPayment(userId, churchId, threshold) {
  const row = await Payment.findOne({
    user: userId,
    church: churchId,
    paidAt: { $gte: threshold },
  })
    .select('_id')
    .lean();
  return Boolean(row);
}

async function syncMemberActiveStatusByPayments(userDoc) {
  if (!userDoc || userDoc.role !== 'MEMBER' || !userDoc.church) return userDoc;
  const oneMonthAgo = newMemberGraceThresholdDate();
  const joinedAt = userDoc.membershipDate || userDoc.createdAt;
  if (joinedAt && new Date(joinedAt) >= oneMonthAgo) {
    if (!userDoc.isActive) {
      userDoc.isActive = true;
      await userDoc.save();
    }
    return userDoc;
  }
  const threshold = recentThresholdDate();
  const shouldBeActive = await hasRecentPayment(userDoc._id, userDoc.church, threshold);
  if (userDoc.isActive !== shouldBeActive) {
    userDoc.isActive = shouldBeActive;
    await userDoc.save();
  }
  return userDoc;
}

module.exports = { syncMemberActiveStatusByPayments };

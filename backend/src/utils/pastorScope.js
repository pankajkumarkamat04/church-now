const Church = require('../models/Church');
const User = require('../models/User');

const PASTOR_SCOPES = ['MAIN_CHURCH', 'LOCAL'];

async function getMainChurchLean() {
  return Church.findOne({ churchType: 'MAIN', isActive: { $ne: false } })
    .select('name churchType localLeadership')
    .populate('localLeadership.spiritualPastor', 'fullName email memberId')
    .lean();
}

async function getSubChurchIds() {
  return Church.find({ churchType: 'SUB', isActive: { $ne: false } }).distinct('_id');
}

function spiritualPastorIdFromChurch(church) {
  const sp = church?.localLeadership?.spiritualPastor;
  if (!sp) return null;
  if (typeof sp === 'object' && sp._id) return String(sp._id);
  return String(sp);
}

async function isMainChurchSpiritualLeader(userId) {
  const main = await getMainChurchLean();
  if (!main) return false;
  return spiritualPastorIdFromChurch(main) === String(userId);
}

function serializePastorUser(user, extras = {}) {
  if (!user) return null;
  const church = user.church;
  return {
    id: String(user._id),
    _id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    memberId: user.memberId || '',
    role: user.role,
    memberCategory: user.memberCategory,
    pastorServiceScope: user.pastorServiceScope || null,
    church:
      church && typeof church === 'object'
        ? { _id: String(church._id), name: church.name, churchType: church.churchType }
        : church
          ? String(church)
          : null,
    ...extras,
  };
}

async function setPastorMainChurchPool(user) {
  if (!user) return;
  user.memberCategory = 'PASTOR';
  user.pastorServiceScope = 'MAIN_CHURCH';
  await user.save();
}

async function setPastorLocalSpiritual(user) {
  if (!user) return;
  user.memberCategory = 'PASTOR';
  user.pastorServiceScope = 'LOCAL';
  await user.save();
}

async function clearLocalSpiritualAtChurch(church, pastorUserId) {
  if (!church) return;
  const currentId = spiritualPastorIdFromChurch(church);
  if (currentId && String(currentId) === String(pastorUserId)) {
    if (!church.localLeadership) church.localLeadership = {};
    church.localLeadership.spiritualPastor = null;
    await church.save();
  }
}

module.exports = {
  PASTOR_SCOPES,
  getMainChurchLean,
  getSubChurchIds,
  spiritualPastorIdFromChurch,
  isMainChurchSpiritualLeader,
  serializePastorUser,
  setPastorMainChurchPool,
  setPastorLocalSpiritual,
  clearLocalSpiritualAtChurch,
};

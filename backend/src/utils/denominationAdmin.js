const Church = require('../models/Church');
const User = require('../models/User');

async function getMainChurch() {
  return Church.findOne({ churchType: 'MAIN', isActive: { $ne: false } })
    .select('name localLeadership churchType')
    .lean();
}

function churchPresidentId(mainChurch) {
  const p = mainChurch?.localLeadership?.churchPresident;
  if (!p) return null;
  return String(typeof p === 'object' && p._id ? p._id : p);
}

function isMainChurchPresident(userId, mainChurch) {
  const uid = String(userId || '');
  if (!uid || !mainChurch) return false;
  return churchPresidentId(mainChurch) === uid;
}

async function canUserAppointDenominationAdmin(user) {
  if (!user) return false;
  if (user.role === 'SUPERADMIN') return true;
  const main = await getMainChurch();
  return isMainChurchPresident(user._id, main);
}

async function getCurrentDenominationAdmin() {
  const row = await User.findOne({ role: 'CHURCH_ADMIN', isActive: true })
    .select('email fullName firstName surname memberId memberCategory church')
    .populate('church', 'name churchType')
    .populate('denominationAdminAppointedBy', 'fullName email')
    .lean();
  return row;
}

async function assertPastorEligibleForDenominationAdmin(userId) {
  const pastor = await User.findOne({
    _id: userId,
    role: { $in: ['MEMBER', 'ADMIN'] },
    memberCategory: 'PASTOR',
    isActive: true,
  })
    .select('_id email fullName memberCategory role church')
    .populate('church', 'name churchType')
    .lean();
  if (!pastor) {
    const err = new Error('Church Admin must be an active pastor (PASTOR category) from any congregation');
    err.statusCode = 400;
    throw err;
  }
  return pastor;
}

async function revokeDenominationAdminRole(previousAdminId) {
  if (!previousAdminId) return;
  const prev = await User.findById(previousAdminId);
  if (!prev || prev.role !== 'CHURCH_ADMIN') return;
  const hasAdminChurches = Array.isArray(prev.adminChurches) && prev.adminChurches.length > 0;
  prev.role = hasAdminChurches ? 'ADMIN' : 'MEMBER';
  prev.denominationAdminAppointedAt = null;
  prev.denominationAdminAppointedBy = null;
  await prev.save();
}

module.exports = {
  getMainChurch,
  churchPresidentId,
  isMainChurchPresident,
  canUserAppointDenominationAdmin,
  getCurrentDenominationAdmin,
  assertPastorEligibleForDenominationAdmin,
  revokeDenominationAdminRole,
};

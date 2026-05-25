const User = require('../models/User');
const {
  canUserAppointDenominationAdmin,
  getCurrentDenominationAdmin,
  assertPastorEligibleForDenominationAdmin,
  revokeDenominationAdminRole,
  getMainChurch,
  churchPresidentId,
} = require('../utils/denominationAdmin');

function serializeAdmin(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    memberId: user.memberId || '',
    memberCategory: user.memberCategory,
    role: user.role,
    church: user.church,
    appointedAt: user.denominationAdminAppointedAt || null,
    appointedBy: user.denominationAdminAppointedBy
      ? {
          id: String(user.denominationAdminAppointedBy._id || user.denominationAdminAppointedBy),
          fullName: user.denominationAdminAppointedBy.fullName,
          email: user.denominationAdminAppointedBy.email,
        }
      : null,
  };
}

async function getDenominationAdminStatus(req, res) {
  const [admin, mainChurch, canAppoint] = await Promise.all([
    getCurrentDenominationAdmin(),
    getMainChurch(),
    canUserAppointDenominationAdmin(req.user),
  ]);
  return res.json({
    admin: serializeAdmin(admin),
    mainChurch: mainChurch
      ? {
          id: String(mainChurch._id),
          name: mainChurch.name,
          churchPresidentId: churchPresidentId(mainChurch),
        }
      : null,
    canAppoint,
    isDenominationAdmin: req.user?.role === 'CHURCH_ADMIN',
  });
}

async function appointDenominationAdmin(req, res) {
  const canAppoint = await canUserAppointDenominationAdmin(req.user);
  if (!canAppoint) {
    return res.status(403).json({
      message: 'Only the main church president or system superadmin may appoint the denomination Church Admin',
    });
  }

  const userId = String(req.body?.userId || '').trim();
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  let pastor;
  try {
    pastor = await assertPastorEligibleForDenominationAdmin(userId);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message });
  }

  const existing = await getCurrentDenominationAdmin();
  if (existing && String(existing._id) === userId) {
    return res.status(400).json({ message: 'This pastor is already the denomination Church Admin' });
  }

  if (existing) {
    await revokeDenominationAdminRole(existing._id);
  }

  const doc = await User.findById(userId);
  doc.role = 'CHURCH_ADMIN';
  doc.denominationAdminAppointedAt = new Date();
  doc.denominationAdminAppointedBy = req.user._id;
  await doc.save();

  const fresh = await User.findById(doc._id)
    .select('email fullName firstName surname memberId memberCategory church role denominationAdminAppointedAt')
    .populate('church', 'name churchType')
    .populate('denominationAdminAppointedBy', 'fullName email')
    .lean();

  return res.status(201).json({
    message: 'Church Admin appointed. This pastor now runs denomination-wide affairs via the control panel.',
    admin: serializeAdmin(fresh),
  });
}

async function revokeDenominationAdmin(req, res) {
  const canAppoint = await canUserAppointDenominationAdmin(req.user);
  if (!canAppoint) {
    return res.status(403).json({ message: 'Only the main church president or system superadmin may revoke Church Admin' });
  }

  const admin = await getCurrentDenominationAdmin();
  if (!admin) return res.status(404).json({ message: 'No Church Admin is currently appointed' });

  await revokeDenominationAdminRole(admin._id);
  return res.json({ message: 'Church Admin role revoked' });
}

module.exports = {
  getDenominationAdminStatus,
  appointDenominationAdmin,
  revokeDenominationAdmin,
};

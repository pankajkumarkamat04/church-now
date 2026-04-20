const User = require('../models/User');

/**
 * Resolve a unique memberId for a MEMBER at this church.
 * If requested is non-empty, use it after duplicate check; otherwise auto-assign MEM-000001.
 */
async function resolveMemberIdForChurch(churchId, requestedRaw) {
  if (!churchId) {
    const err = new Error('Church is required for member ID');
    err.statusCode = 400;
    throw err;
  }
  const requested = requestedRaw != null ? String(requestedRaw).trim() : '';
  if (requested) {
    const dup = await User.findOne({
      church: churchId,
      role: 'MEMBER',
      memberId: requested,
    }).select('_id');
    if (dup) {
      const err = new Error('This member ID is already in use at this church');
      err.statusCode = 400;
      throw err;
    }
    return requested;
  }
  const prefix = 'MEM-';
  const pattern = new RegExp(`^${prefix}\\d{6}$`);
  const members = await User.find({
    church: churchId,
    role: 'MEMBER',
    memberId: pattern,
  })
    .select('memberId')
    .lean();
  let maxNum = 0;
  for (const m of members) {
    const n = parseInt(String(m.memberId || '').slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}

module.exports = { resolveMemberIdForChurch };

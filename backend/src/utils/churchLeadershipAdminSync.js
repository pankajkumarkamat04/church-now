const User = require('../models/User');

/**
 * Promote congregation leaders to ADMIN for this church (idempotent).
 */
async function grantLeaderAdminAtChurch(userId, churchId) {
  const uid = String(userId);
  const cid = String(churchId);
  const user = await User.findById(uid).select('_id role adminChurches church');
  if (!user || user.role === 'SUPERADMIN') return;

  if (user.role === 'MEMBER') {
    user.role = 'ADMIN';
    const churches = user.adminChurches || [];
    if (!churches.map(String).includes(cid)) churches.push(churchId);
    user.adminChurches = churches;
    await user.save();
    return;
  }

  if (user.role === 'ADMIN') {
    const churches = user.adminChurches || [];
    if (!churches.map(String).includes(cid)) churches.push(churchId);
    user.adminChurches = churches;
    await user.save();
  }
}

/**
 * Remove admin access for this church when no longer in leadership.
 * Keeps ADMIN role if other adminChurches remain.
 */
async function revokeLeaderAdminAtChurch(userId, churchId) {
  const cid = String(churchId);
  const user = await User.findById(userId).select('_id role adminChurches');
  if (!user || user.role === 'SUPERADMIN') return;
  if (user.role !== 'ADMIN') return;

  const remaining = (user.adminChurches || []).filter((id) => String(id) !== cid);
  user.adminChurches = remaining;
  if (remaining.length === 0) {
    user.role = 'MEMBER';
  }
  await user.save();
}

/**
 * After saving church leadership: officer/council slots become ADMIN for this church;
 * committee members never receive admin (badge-only in member UI).
 *
 * @param {string|import('mongoose').Types.ObjectId} churchId
 * @param {string[]} previousAdminLeaderIds — prior single roles + councils (no committee)
 * @param {string[]} nextAdminLeaderIds — next single roles + councils (no committee)
 * @param {string[]} [previousCommitteeMemberIds]
 * @param {string[]} [nextCommitteeMemberIds]
 */
async function syncChurchLeadershipAdmins(
  churchId,
  previousAdminLeaderIds,
  nextAdminLeaderIds,
  previousCommitteeMemberIds,
  nextCommitteeMemberIds
) {
  const cid = String(churchId);
  const prevSet = new Set((previousAdminLeaderIds || []).map(String));
  const nextSet = new Set((nextAdminLeaderIds || []).map(String));
  const prevComm = new Set((previousCommitteeMemberIds || []).map(String));
  const nextComm = new Set((nextCommitteeMemberIds || []).map(String));

  const removed = [...prevSet].filter((id) => !nextSet.has(id));
  for (const id of removed) {
    // eslint-disable-next-line no-await-in-loop
    await revokeLeaderAdminAtChurch(id, cid);
  }
  for (const id of nextSet) {
    // eslint-disable-next-line no-await-in-loop
    await grantLeaderAdminAtChurch(id, cid);
  }

  // Committee is non-admin: strip admin if they only serve on committee (or also committee without an officer role).
  for (const id of nextComm) {
    if (!nextSet.has(id)) {
      // eslint-disable-next-line no-await-in-loop
      await revokeLeaderAdminAtChurch(id, cid);
    }
  }

  // Left the committee and not an officer anymore.
  for (const id of prevComm) {
    if (!nextComm.has(id) && !nextSet.has(id)) {
      // eslint-disable-next-line no-await-in-loop
      await revokeLeaderAdminAtChurch(id, cid);
    }
  }
}

module.exports = {
  syncChurchLeadershipAdmins,
  grantLeaderAdminAtChurch,
  revokeLeaderAdminAtChurch,
};

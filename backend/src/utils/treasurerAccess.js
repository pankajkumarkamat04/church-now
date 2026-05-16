const Church = require('../models/Church');

async function loadChurchTreasuryLeadership(churchIdValue) {
  if (!churchIdValue) return null;
  return Church.findById(churchIdValue)
    .select('localLeadership.treasurer localLeadership.viceTreasurer')
    .lean();
}

function isTreasurerOrViceTreasurer(church, userId) {
  const uid = String(userId || '');
  if (!uid || !church?.localLeadership) return false;
  const { treasurer, viceTreasurer } = church.localLeadership;
  return String(treasurer || '') === uid || String(viceTreasurer || '') === uid;
}

/**
 * @param {import('../models/User')} userDoc — populated or lean user with church / adminChurches
 */
async function userCanManageTreasury(userDoc) {
  if (!userDoc?._id) return false;
  const uid = userDoc._id;

  const churchIds = [];
  if (userDoc.church) {
    churchIds.push(userDoc.church._id || userDoc.church);
  }
  if (Array.isArray(userDoc.adminChurches)) {
    for (const c of userDoc.adminChurches) {
      churchIds.push(c?._id || c);
    }
  }

  const unique = [...new Set(churchIds.map((id) => String(id)).filter(Boolean))];
  for (const cid of unique) {
    const church = await loadChurchTreasuryLeadership(cid);
    if (isTreasurerOrViceTreasurer(church, uid)) return true;
  }
  return false;
}

async function ensureTreasurerAccess(req, res, churchIdValue) {
  const cid = churchIdValue || req.user?.church;
  if (!cid) {
    res.status(400).json({ message: 'No church assigned' });
    return false;
  }
  const church = await loadChurchTreasuryLeadership(cid);
  if (!isTreasurerOrViceTreasurer(church, req.user?._id)) {
    res.status(403).json({
      message: 'Only treasurer or vice treasurer can perform this action',
    });
    return false;
  }
  return true;
}

module.exports = {
  loadChurchTreasuryLeadership,
  isTreasurerOrViceTreasurer,
  userCanManageTreasury,
  ensureTreasurerAccess,
};

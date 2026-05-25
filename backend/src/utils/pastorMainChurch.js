const Church = require('../models/Church');

async function getMainChurchIds() {
  return Church.find({ churchType: 'MAIN', isActive: { $ne: false } }).distinct('_id');
}

/**
 * When listing pastors/terms for all congregations, exclude the main church
 * (managed on the dedicated Main Church Pastor flow).
 */
async function pastorListChurchFilter(churchIdQuery) {
  if (churchIdQuery) {
    return { church: churchIdQuery };
  }
  const mainIds = await getMainChurchIds();
  if (!mainIds.length) return {};
  return { church: { $nin: mainIds } };
}

module.exports = { getMainChurchIds, pastorListChurchFilter };

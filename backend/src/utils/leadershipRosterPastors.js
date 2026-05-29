const User = require('../models/User');
const Church = require('../models/Church');
const PastorRecord = require('../models/PastorRecord');
const PastorTerm = require('../models/PastorTerm');
const { ACTIVE_PASTOR_TERM_STATUSES } = require('./memberRoleSync');

/**
 * All user IDs that should appear in the main-church leadership "pastors" picker.
 * Matches pastor management: category, records, active terms, spiritual pastors, and service scope.
 */
async function collectPastorUserIdsForRoster() {
  const [categoryIds, recordIds, termIds, scopeIds, spiritualChurches] = await Promise.all([
    User.find({
      role: { $in: ['MEMBER', 'ADMIN'] },
      isActive: { $ne: false },
      memberCategory: 'PASTOR',
    })
      .distinct('_id'),
    PastorRecord.find({ isActive: { $ne: false } }).distinct('member'),
    PastorTerm.find({ status: { $in: ACTIVE_PASTOR_TERM_STATUSES } }).distinct('pastor'),
    User.find({
      role: { $in: ['MEMBER', 'ADMIN'] },
      isActive: { $ne: false },
      pastorServiceScope: { $in: ['MAIN_CHURCH', 'LOCAL'] },
    }).distinct('_id'),
    Church.find({
      'localLeadership.spiritualPastor': { $exists: true, $ne: null },
    })
      .select('localLeadership.spiritualPastor')
      .lean(),
  ]);

  const ids = new Set();
  const add = (id) => {
    if (id) ids.add(String(id));
  };

  for (const id of categoryIds) add(id);
  for (const id of recordIds) add(id);
  for (const id of termIds) add(id);
  for (const id of scopeIds) add(id);
  for (const church of spiritualChurches) {
    add(church?.localLeadership?.spiritualPastor);
  }

  return [...ids];
}

module.exports = {
  collectPastorUserIdsForRoster,
};

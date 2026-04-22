const PastorTerm = require('../models/PastorTerm');
const { ACTIVE_PASTOR_TERM_STATUSES } = require('./memberRoleSync');

const PASTOR_MEMBER_SELECT = 'fullName firstName surname email';

function isPopulatedMemberRef(ref) {
  return (
    ref &&
    typeof ref === 'object' &&
    !Array.isArray(ref) &&
    (ref.fullName || ref.firstName || ref.surname || ref.email)
  );
}

/**
 * In-memory enrichment for list responses: if `localLeadership.spiritualPastor` is
 * empty, fill from `localLeadership.minister` or the active `PastorTerm` pastor
 * (same “spiritual leader” the app uses elsewhere). Does not change the database.
 * @param {Array<object>} rows — lean church objects with `localLeadership` population
 */
async function enrichChurchRowsForLocalMinisterList(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const churchIds = rows.map((r) => r._id);

  const terms = await PastorTerm.find({
    church: { $in: churchIds },
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .populate('pastor', PASTOR_MEMBER_SELECT)
    .sort({ termStart: -1, createdAt: -1 })
    .lean();

  const firstPastorByChurch = new Map();
  for (const t of terms) {
    if (!t.pastor) continue;
    const cid = String(t.church);
    if (!firstPastorByChurch.has(cid)) {
      firstPastorByChurch.set(cid, t.pastor);
    }
  }

  return rows.map((row) => {
    const ll = row.localLeadership && typeof row.localLeadership === 'object' ? { ...row.localLeadership } : {};

    if (isPopulatedMemberRef(ll.spiritualPastor)) {
      return row;
    }

    if (isPopulatedMemberRef(ll.minister)) {
      return {
        ...row,
        localLeadership: { ...ll, spiritualPastor: ll.minister },
      };
    }

    const fromTerm = firstPastorByChurch.get(String(row._id));
    if (fromTerm) {
      return {
        ...row,
        localLeadership: { ...ll, spiritualPastor: fromTerm },
      };
    }
    return row;
  });
}

module.exports = { enrichChurchRowsForLocalMinisterList, isPopulatedMemberRef };

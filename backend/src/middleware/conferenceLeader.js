const Conference = require('../models/Conference');
const { leadershipOrCondition, POPULATE_LEADERSHIP } = require('../utils/conferenceLeaderAccess');

/**
 * Requires authenticated user to appear in `Conference.localLeadership` for at least one conference.
 * Attaches populated conference docs to `req.leaderConferenceDocs`.
 */
async function requireConferenceLeader(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const docs = await Conference.find({
      $or: leadershipOrCondition(req.user._id),
    }).populate(POPULATE_LEADERSHIP);

    if (!docs.length) {
      return res.status(403).json({ message: 'Conference leadership access only' });
    }
    req.leaderConferenceDocs = docs;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireConferenceLeader };

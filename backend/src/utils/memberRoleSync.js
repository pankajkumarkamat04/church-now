const User = require('../models/User');
const PastorTerm = require('../models/PastorTerm');
const { collectCongregationRoleLabelsForUser } = require('./churchMemberRoles');

const ACTIVE_PASTOR_TERM_STATUSES = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'];
const SPIRITUAL_LABEL = 'Spiritual leader/Pastor';

async function syncChurchMemberRoleDisplays(churchDocOrLean) {
  if (!churchDocOrLean || !churchDocOrLean._id) return;
  const churchId = String(churchDocOrLean._id);
  const members = await User.find({ role: 'MEMBER', church: churchId }).select('_id memberCategory');
  if (!members.length) return;

  const pastorTerms = await PastorTerm.find({
    church: churchId,
    status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
  })
    .select('pastor')
    .lean();
  const pastorIdSet = new Set(pastorTerms.map((t) => String(t.pastor)));

  for (const member of members) {
    const labels = collectCongregationRoleLabelsForUser(churchDocOrLean, member._id);
    if (pastorIdSet.has(String(member._id)) && !labels.some((x) => String(x).toLowerCase().includes('spiritual'))) {
      labels.unshift(SPIRITUAL_LABEL);
    }
    const display = labels.length > 0 ? labels.join(', ') : (member.memberCategory || 'MEMBER');
    member.memberRoleDisplay = display;
    await member.save();
  }
}

module.exports = {
  syncChurchMemberRoleDisplays,
  ACTIVE_PASTOR_TERM_STATUSES,
  SPIRITUAL_LABEL,
};

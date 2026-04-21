const AttendanceSession = require('../models/AttendanceSession');
const User = require('../models/User');

function churchId(req) {
  return req.user?.church ? String(req.user.church) : '';
}

function isIsoDateKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

async function listMonth(req, res) {
  try {
    const cid = churchId(req);
    if (!cid) return res.status(400).json({ message: 'No church assigned' });
    const month = String(req.query.month || '');
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month must be YYYY-MM' });
    }
    const rows = await AttendanceSession.find({
      church: cid,
      dateKey: { $gte: `${month}-01`, $lte: `${month}-31` },
    })
      .select('dateKey entries updatedAt')
      .sort({ dateKey: 1 })
      .lean();
    return res.json(
      rows.map((r) => ({
        dateKey: r.dateKey,
        presentCount: Array.isArray(r.entries) ? r.entries.filter((e) => e.status === 'PRESENT').length : 0,
        totalCount: Array.isArray(r.entries) ? r.entries.length : 0,
        updatedAt: r.updatedAt,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load attendance month' });
  }
}

async function getDay(req, res) {
  try {
    const cid = churchId(req);
    if (!cid) return res.status(400).json({ message: 'No church assigned' });
    const { dateKey } = req.params;
    if (!isIsoDateKey(dateKey)) return res.status(400).json({ message: 'dateKey must be YYYY-MM-DD' });

    const members = await User.find({ role: 'MEMBER', church: cid }).select('_id fullName email memberId isActive').sort({ fullName: 1, email: 1 }).lean();
    const session = await AttendanceSession.findOne({ church: cid, dateKey }).lean();
    const byMember = new Map((session?.entries || []).map((e) => [String(e.member), e]));

    return res.json({
      dateKey,
      members: members.map((m) => {
        const hit = byMember.get(String(m._id));
        return {
          memberId: String(m._id),
          memberCode: m.memberId || '',
          name: m.fullName || m.email || 'Member',
          isActive: m.isActive !== false,
          status: hit?.status || 'ABSENT',
          note: hit?.note || '',
        };
      }),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load attendance day' });
  }
}

async function saveDay(req, res) {
  try {
    const cid = churchId(req);
    if (!cid) return res.status(400).json({ message: 'No church assigned' });
    const { dateKey } = req.params;
    if (!isIsoDateKey(dateKey)) return res.status(400).json({ message: 'dateKey must be YYYY-MM-DD' });
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (entries.length === 0) return res.status(400).json({ message: 'entries are required' });

    const memberIds = entries.map((e) => String(e.memberId || '')).filter(Boolean);
    const validMembers = await User.find({ _id: { $in: memberIds }, role: 'MEMBER', church: cid }).select('_id').lean();
    const validSet = new Set(validMembers.map((m) => String(m._id)));
    if (!memberIds.every((id) => validSet.has(id))) {
      return res.status(400).json({ message: 'One or more memberIds are invalid for this church' });
    }

    const normalized = entries.map((e) => ({
      member: String(e.memberId),
      status: String(e.status || '').toUpperCase() === 'PRESENT' ? 'PRESENT' : 'ABSENT',
      note: String(e.note || '').trim(),
    }));

    const row = await AttendanceSession.findOneAndUpdate(
      { church: cid, dateKey },
      {
        $set: {
          entries: normalized,
          updatedBy: req.user._id,
        },
        $setOnInsert: { createdBy: req.user._id, church: cid, dateKey },
      },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json({
      dateKey: row.dateKey,
      presentCount: row.entries.filter((e) => e.status === 'PRESENT').length,
      totalCount: row.entries.length,
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to save attendance day' });
  }
}

async function listMonthSuperadmin(req, res) {
  try {
    const church = String(req.query.churchId || '');
    const month = String(req.query.month || '');
    if (!church) return res.status(400).json({ message: 'churchId is required' });
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month must be YYYY-MM' });
    const rows = await AttendanceSession.find({
      church,
      dateKey: { $gte: `${month}-01`, $lte: `${month}-31` },
    })
      .select('dateKey entries updatedAt')
      .sort({ dateKey: 1 })
      .lean();
    return res.json(
      rows.map((r) => ({
        dateKey: r.dateKey,
        presentCount: Array.isArray(r.entries) ? r.entries.filter((e) => e.status === 'PRESENT').length : 0,
        totalCount: Array.isArray(r.entries) ? r.entries.length : 0,
        updatedAt: r.updatedAt,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load attendance month' });
  }
}

async function getDaySuperadmin(req, res) {
  try {
    const church = String(req.query.churchId || '');
    const { dateKey } = req.params;
    if (!church) return res.status(400).json({ message: 'churchId is required' });
    if (!isIsoDateKey(dateKey)) return res.status(400).json({ message: 'dateKey must be YYYY-MM-DD' });
    const members = await User.find({ role: 'MEMBER', church })
      .select('_id fullName email memberId isActive')
      .sort({ fullName: 1, email: 1 })
      .lean();
    const session = await AttendanceSession.findOne({ church, dateKey }).lean();
    const byMember = new Map((session?.entries || []).map((e) => [String(e.member), e]));
    return res.json({
      dateKey,
      members: members.map((m) => {
        const hit = byMember.get(String(m._id));
        return {
          memberId: String(m._id),
          memberCode: m.memberId || '',
          name: m.fullName || m.email || 'Member',
          isActive: m.isActive !== false,
          status: hit?.status || 'ABSENT',
          note: hit?.note || '',
        };
      }),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load attendance day' });
  }
}

async function saveDaySuperadmin(req, res) {
  try {
    const church = String(req.body?.churchId || req.query.churchId || '');
    const { dateKey } = req.params;
    if (!church) return res.status(400).json({ message: 'churchId is required' });
    if (!isIsoDateKey(dateKey)) return res.status(400).json({ message: 'dateKey must be YYYY-MM-DD' });
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (entries.length === 0) return res.status(400).json({ message: 'entries are required' });
    const memberIds = entries.map((e) => String(e.memberId || '')).filter(Boolean);
    const validMembers = await User.find({ _id: { $in: memberIds }, role: 'MEMBER', church }).select('_id').lean();
    const validSet = new Set(validMembers.map((m) => String(m._id)));
    if (!memberIds.every((id) => validSet.has(id))) {
      return res.status(400).json({ message: 'One or more memberIds are invalid for this church' });
    }
    const normalized = entries.map((e) => ({
      member: String(e.memberId),
      status: String(e.status || '').toUpperCase() === 'PRESENT' ? 'PRESENT' : 'ABSENT',
      note: String(e.note || '').trim(),
    }));
    const row = await AttendanceSession.findOneAndUpdate(
      { church, dateKey },
      { $set: { entries: normalized, updatedBy: req.user._id }, $setOnInsert: { createdBy: req.user._id, church, dateKey } },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json({
      dateKey: row.dateKey,
      presentCount: row.entries.filter((e) => e.status === 'PRESENT').length,
      totalCount: row.entries.length,
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to save attendance day' });
  }
}

module.exports = { listMonth, getDay, saveDay, listMonthSuperadmin, getDaySuperadmin, saveDaySuperadmin };

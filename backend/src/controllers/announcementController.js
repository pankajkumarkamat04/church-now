const Announcement = require('../models/Announcement');
const Church = require('../models/Church');
const User = require('../models/User');
const { ANNOUNCEMENT_TARGET_ROLES } = require('../models/Announcement');

const LEADERSHIP_ROLE_TO_FIELD = {
  TREASURER: 'treasurer',
  VICE_TREASURER: 'viceTreasurer',
  SECRETARY: 'secretary',
  VICE_SECRETARY: 'viceSecretary',
  DEACON: 'deacon',
  VICE_DEACON: 'viceDeacon',
};

function normalizeTargetRoles(input) {
  const values = Array.isArray(input) ? input : [];
  const normalized = Array.from(new Set(values.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean)));
  const invalid = normalized.filter((v) => !ANNOUNCEMENT_TARGET_ROLES.includes(v));
  if (invalid.length) {
    const err = new Error(`Invalid targetRoles: ${invalid.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

async function normalizeTargetUsers(inputUserIds, churchId) {
  const ids = Array.isArray(inputUserIds)
    ? Array.from(new Set(inputUserIds.map((id) => String(id || '').trim()).filter(Boolean)))
    : [];
  if (ids.length === 0) return [];
  const valid = await User.find({ _id: { $in: ids }, church: churchId }).select('_id').lean();
  if (valid.length !== ids.length) {
    const err = new Error('One or more selected members are not in the selected church');
    err.statusCode = 400;
    throw err;
  }
  return ids;
}

async function listAdminAnnouncements(req, res) {
  const churchId = req.user?.church;
  if (!churchId) return res.status(400).json({ message: 'No church assigned' });
  const rows = await Announcement.find({ scope: 'CHURCH', church: churchId })
    .populate('createdBy', 'fullName email')
    .populate('targetUsers', 'fullName email memberId')
    .sort({ createdAt: -1 });
  return res.json(rows);
}

async function createAdminAnnouncement(req, res) {
  const churchId = req.user?.church;
  if (!churchId) return res.status(400).json({ message: 'No church assigned' });
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!title || !message) return res.status(400).json({ message: 'title and message are required' });
  const targetRoles = normalizeTargetRoles(req.body?.targetRoles);
  const targetUsers = await normalizeTargetUsers(req.body?.targetUserIds, churchId);
  const row = await Announcement.create({
    title,
    message,
    scope: 'CHURCH',
    church: churchId,
    targetRoles,
    targetUsers,
    createdBy: req.user._id,
    createdByRole: req.user.role,
  });
  const populated = await Announcement.findById(row._id)
    .populate('createdBy', 'fullName email')
    .populate('targetUsers', 'fullName email memberId');
  return res.status(201).json(populated);
}

async function listSuperadminAnnouncements(req, res) {
  const churchId = String(req.query?.churchId || '').trim();
  const scope = String(req.query?.scope || '').trim().toUpperCase();
  const q = {};
  if (scope === 'SYSTEM' || scope === 'CHURCH') q.scope = scope;
  if (churchId) q.church = churchId;
  const rows = await Announcement.find(q)
    .populate('church', 'name')
    .populate('createdBy', 'fullName email')
    .populate('targetUsers', 'fullName email memberId')
    .sort({ createdAt: -1 });
  return res.json(rows);
}

async function createSuperadminAnnouncement(req, res) {
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();
  const scope = String(req.body?.scope || 'SYSTEM').trim().toUpperCase();
  if (!title || !message) return res.status(400).json({ message: 'title and message are required' });
  if (!['SYSTEM', 'CHURCH'].includes(scope)) return res.status(400).json({ message: 'scope must be SYSTEM or CHURCH' });
  const churchId = String(req.body?.churchId || '').trim();
  let resolvedChurchId = null;
  if (scope === 'CHURCH') {
    if (!churchId) return res.status(400).json({ message: 'churchId is required for CHURCH scope' });
    const church = await Church.findOne({ _id: churchId, isActive: true }).select('_id');
    if (!church) return res.status(404).json({ message: 'Church not found' });
    resolvedChurchId = church._id;
  }
  const targetRoles = normalizeTargetRoles(req.body?.targetRoles);
  const targetUsers = scope === 'CHURCH' ? await normalizeTargetUsers(req.body?.targetUserIds, resolvedChurchId) : [];
  const row = await Announcement.create({
    title,
    message,
    scope,
    church: resolvedChurchId,
    targetRoles,
    targetUsers,
    createdBy: req.user._id,
    createdByRole: req.user.role,
  });
  const populated = await Announcement.findById(row._id)
    .populate('church', 'name')
    .populate('createdBy', 'fullName email')
    .populate('targetUsers', 'fullName email memberId');
  return res.status(201).json(populated);
}

async function listMyAnnouncements(req, res) {
  const userId = String(req.user?._id || '');
  const userRole = String(req.user?.role || '').toUpperCase();
  const churchId = req.user?.church ? String(req.user.church) : '';
  const membership = new Set([userRole]);
  if (churchId) {
    const church = await Church.findById(churchId).select('localLeadership').lean();
    const local = church?.localLeadership || {};
    for (const [roleCode, field] of Object.entries(LEADERSHIP_ROLE_TO_FIELD)) {
      if (String(local[field] || '') === userId) membership.add(roleCode);
    }
  }
  const roleArray = [...membership];
  const rows = await Announcement.find({
    isActive: true,
    $or: [{ scope: 'SYSTEM' }, ...(churchId ? [{ scope: 'CHURCH', church: churchId }] : [])],
  })
    .populate('church', 'name')
    .populate('createdBy', 'fullName email')
    .sort({ createdAt: -1 })
    .lean();

  const filtered = rows.filter((row) => {
    const targetRoles = Array.isArray(row.targetRoles) ? row.targetRoles : [];
    const targetUsers = Array.isArray(row.targetUsers) ? row.targetUsers.map((id) => String(id)) : [];
    if (targetRoles.length === 0 && targetUsers.length === 0) return true;
    if (targetUsers.includes(userId)) return true;
    return targetRoles.some((r) => roleArray.includes(String(r)));
  });
  return res.json(filtered);
}

module.exports = {
  listAdminAnnouncements,
  createAdminAnnouncement,
  listSuperadminAnnouncements,
  createSuperadminAnnouncement,
  listMyAnnouncements,
};

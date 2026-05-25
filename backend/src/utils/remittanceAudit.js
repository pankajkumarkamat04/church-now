const ChurchRemittanceAudit = require('../models/ChurchRemittanceAudit');
const User = require('../models/User');

function displayName(user) {
  if (!user) return 'System';
  if (typeof user === 'string') return user;
  return (user.fullName || user.email || String(user._id || '')).trim() || 'Unknown';
}

async function appendRemittanceAudit({
  churchId,
  entryId = null,
  monthKey = '',
  remitType = null,
  amount = null,
  action,
  actorId = null,
  details = '',
  meta = null,
  at = new Date(),
}) {
  let actorName = 'System';
  if (actorId) {
    const u = await User.findById(actorId).select('fullName email').lean();
    actorName = displayName(u);
  }
  await ChurchRemittanceAudit.create({
    church: churchId,
    entryId,
    monthKey: monthKey || undefined,
    remitType,
    amount: amount != null ? Number(amount) : null,
    action,
    actor: actorId,
    details: details || '',
    meta: { ...(meta || {}), actorName },
    at,
  });
}

function mapRemittanceEntryAuditFields(entry) {
  const createdBy = entry.createdBy;
  const updatedBy = entry.updatedBy;
  const createdByName = displayName(createdBy);
  const updatedByName = displayName(updatedBy);
  const wasUpdated =
    entry.updatedAt &&
    entry.createdAt &&
    String(entry.updatedAt) !== String(entry.createdAt);
  return {
    id: String(entry._id),
    remitType: entry.remitType,
    amount: Number(entry.amount || 0),
    paidAt: entry.paidAt || null,
    note: entry.note || '',
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
    createdByName,
    updatedByName: wasUpdated ? updatedByName : '',
    postedByName: createdByName,
    lastModifiedByName: wasUpdated ? updatedByName : createdByName,
  };
}

function serializeAuditRow(row) {
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
  const actorFromPopulate = row.actor;
  const actorName = meta.actorName || displayName(actorFromPopulate);
  return {
    id: String(row._id),
    entryId: row.entryId ? String(row.entryId) : null,
    monthKey: row.monthKey || '',
    remitType: row.remitType || '',
    amount: row.amount != null ? Number(row.amount) : null,
    action: row.action,
    actorName,
    actorEmail: actorFromPopulate?.email || '',
    details: row.details || '',
    meta,
    at: row.at || null,
  };
}

module.exports = {
  appendRemittanceAudit,
  mapRemittanceEntryAuditFields,
  serializeAuditRow,
  displayName,
};

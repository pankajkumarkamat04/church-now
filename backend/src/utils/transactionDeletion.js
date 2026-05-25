const Church = require('../models/Church');
const { Payment } = require('../models/Payment');
const Expense = require('../models/Expense');
const ChurchRemittance = require('../models/ChurchRemittance');
const TransactionDeletionRequest = require('../models/TransactionDeletionRequest');
const { appendRemittanceAudit } = require('./remittanceAudit');

async function loadChurchForDeletion(churchId) {
  return Church.findById(churchId).select('churchType localLeadership').lean();
}

function toLeadershipRoleSet(church, userId) {
  const uid = String(userId || '');
  if (!church || !uid) return new Set();
  const roleSet = new Set();
  const leadership = church.localLeadership || {};
  if (String(leadership.viceTreasurer || '') === uid) roleSet.add('VICE_TREASURER');
  if (String(leadership.treasurer || '') === uid) roleSet.add('TREASURER');
  if (String(leadership.deacon || '') === uid) roleSet.add('DEACON');
  if (String(leadership.moderator || '') === uid) roleSet.add('MODERATOR');
  return roleSet;
}

/** Main churches use moderator when no deacon is on the roster. */
function userCanApproveDeaconSlot(church, userId) {
  const roleSet = toLeadershipRoleSet(church, userId);
  if (roleSet.has('DEACON')) return true;
  if (String(church?.churchType || '').toUpperCase() === 'MAIN' && roleSet.has('MODERATOR')) return true;
  return false;
}

function areDeletionApprovalsComplete(approvals) {
  const a = approvals || {};
  return Boolean(a.treasurer && a.viceTreasurer && a.deacon);
}

function applyDeletionApproval(request, church, userId) {
  const roleSet = toLeadershipRoleSet(church, userId);
  const uid = userId;
  if (roleSet.has('TREASURER')) {
    request.approvals.treasurer = true;
    request.approvedBy.treasurer = uid;
  }
  if (roleSet.has('VICE_TREASURER')) {
    request.approvals.viceTreasurer = true;
    request.approvedBy.viceTreasurer = uid;
  }
  if (userCanApproveDeaconSlot(church, userId)) {
    request.approvals.deacon = true;
    request.approvedBy.deacon = uid;
  }
}

function userDeletionApprovalFlags(church, userId) {
  const roleSet = toLeadershipRoleSet(church, userId);
  return {
    canApproveAsTreasurer: roleSet.has('TREASURER'),
    canApproveAsViceTreasurer: roleSet.has('VICE_TREASURER'),
    canApproveAsDeacon: userCanApproveDeaconSlot(church, userId),
  };
}

async function assertTargetBelongsToChurch(targetKind, targetId, churchId) {
  const cid = String(churchId);
  if (targetKind === 'EXPENSE') {
    const row = await Expense.findOne({ _id: targetId, church: cid }).select('_id title amount').lean();
    if (!row) {
      const err = new Error('Expense not found for this church');
      err.statusCode = 404;
      throw err;
    }
    return row;
  }
  if (targetKind === 'PAYMENT') {
    const row = await Payment.findOne({ _id: targetId, church: cid }).select('_id amount paidAt').lean();
    if (!row) {
      const err = new Error('Payment not found for this church');
      err.statusCode = 404;
      throw err;
    }
    return row;
  }
  if (targetKind === 'REMITTANCE') {
    const row = await ChurchRemittance.findOne({ _id: targetId, church: cid }).select('_id amount remitType monthKey').lean();
    if (!row) {
      const err = new Error('Remittance entry not found for this church');
      err.statusCode = 404;
      throw err;
    }
    return row;
  }
  const err = new Error('Invalid targetKind');
  err.statusCode = 400;
  throw err;
}

async function executeApprovedDeletion(request) {
  const { targetKind, targetId, church } = request;
  if (targetKind === 'EXPENSE') {
    await Expense.findOneAndDelete({ _id: targetId, church });
    return;
  }
  if (targetKind === 'PAYMENT') {
    await Payment.findOneAndDelete({ _id: targetId, church });
    return;
  }
  if (targetKind === 'REMITTANCE') {
    const entry = await ChurchRemittance.findOne({ _id: targetId, church }).lean();
    if (entry) {
      const meta = request.toObject ? request.toObject() : request;
      await appendRemittanceAudit({
        churchId: church,
        entryId: entry._id,
        monthKey: entry.monthKey,
        remitType: entry.remitType,
        amount: entry.amount,
        action: 'DELETED',
        actorId: request.approvedBy?.treasurer || request.approvedBy?.viceTreasurer || request.approvedBy?.deacon || request.requestedBy,
        details: `Remittance removed after treasurer, vice treasurer, and deacon approval`,
        meta: {
          deletionRequestId: String(request._id),
          requestedBy: String(request.requestedBy || ''),
          reason: request.reason || '',
          approvals: request.approvals,
          approvedBy: request.approvedBy,
        },
        at: new Date(),
      });
    }
    await ChurchRemittance.findOneAndDelete({ _id: targetId, church });
  }
}

async function loadPendingDeletionsMap(churchId) {
  const rows = await TransactionDeletionRequest.find({ church: churchId, status: 'PENDING' }).lean();
  const map = new Map();
  for (const r of rows) {
    map.set(`${r.targetKind}:${String(r.targetId)}`, r);
  }
  return map;
}

function serializeDeletionRequest(doc, church, userId) {
  const row = doc.toObject ? doc.toObject() : doc;
  const flags = userDeletionApprovalFlags(church, userId);
  const approvals = row.approvals || {};
  return {
    ...row,
    approvalsComplete: areDeletionApprovalsComplete(approvals),
    canCurrentUserApproveDeletion:
      (flags.canApproveAsTreasurer && !approvals.treasurer) ||
      (flags.canApproveAsViceTreasurer && !approvals.viceTreasurer) ||
      (flags.canApproveAsDeacon && !approvals.deacon),
    ...flags,
  };
}

module.exports = {
  loadPendingDeletionsMap,
  loadChurchForDeletion,
  toLeadershipRoleSet,
  userCanApproveDeaconSlot,
  areDeletionApprovalsComplete,
  applyDeletionApproval,
  userDeletionApprovalFlags,
  assertTargetBelongsToChurch,
  executeApprovedDeletion,
  serializeDeletionRequest,
};

const TransactionDeletionRequest = require('../models/TransactionDeletionRequest');
const { appendRemittanceAudit } = require('../utils/remittanceAudit');
const {
  loadChurchForDeletion,
  applyDeletionApproval,
  areDeletionApprovalsComplete,
  assertTargetBelongsToChurch,
  executeApprovedDeletion,
  serializeDeletionRequest,
  userDeletionApprovalFlags,
} = require('../utils/transactionDeletion');

function churchId(req) {
  return req.user?.church;
}

async function listAdminTransactionDeletions(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const status = String(req.query.status || 'PENDING').trim().toUpperCase();
  const targetKind = String(req.query.targetKind || '').trim().toUpperCase();
  const targetId = String(req.query.targetId || '').trim();
  const q = { church: cid };
  if (status) q.status = status;
  if (targetKind) q.targetKind = targetKind;
  if (targetId) q.targetId = targetId;

  const [church, rows] = await Promise.all([
    loadChurchForDeletion(cid),
    TransactionDeletionRequest.find(q)
      .populate('requestedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ]);

  return res.json({
    rows: rows.map((row) => serializeDeletionRequest(row, church, req.user?._id)),
  });
}

async function requestAdminTransactionDeletion(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const targetKind = String(req.body?.targetKind || '').trim().toUpperCase();
  const targetId = String(req.body?.targetId || '').trim();
  const reason = String(req.body?.reason || '').trim();

  if (!['PAYMENT', 'EXPENSE', 'REMITTANCE'].includes(targetKind)) {
    return res.status(400).json({ message: 'targetKind must be PAYMENT, EXPENSE, or REMITTANCE' });
  }
  if (!targetId) return res.status(400).json({ message: 'targetId is required' });

  let targetSnapshot = null;
  try {
    targetSnapshot = await assertTargetBelongsToChurch(targetKind, targetId, cid);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message });
  }

  const existing = await TransactionDeletionRequest.findOne({
    church: cid,
    targetKind,
    targetId,
    status: 'PENDING',
  });
  if (existing) {
    return res.status(400).json({ message: 'A deletion request is already pending for this transaction' });
  }

  const row = await TransactionDeletionRequest.create({
    church: cid,
    targetKind,
    targetId,
    reason,
    requestedBy: req.user._id,
    status: 'PENDING',
    approvals: { treasurer: false, viceTreasurer: false, deacon: false },
    approvedBy: { treasurer: null, viceTreasurer: null, deacon: null },
  });

  if (targetKind === 'REMITTANCE' && targetSnapshot) {
    await appendRemittanceAudit({
      churchId: cid,
      entryId: targetId,
      monthKey: targetSnapshot.monthKey,
      remitType: targetSnapshot.remitType,
      amount: targetSnapshot.amount,
      action: 'DELETE_REQUESTED',
      actorId: req.user._id,
      details: reason
        ? `Deletion requested: ${reason}`
        : 'Deletion requested (awaiting treasurer, vice treasurer, and deacon)',
      meta: { deletionRequestId: String(row._id) },
      at: new Date(),
    });
  }

  const church = await loadChurchForDeletion(cid);
  const populated = await TransactionDeletionRequest.findById(row._id)
    .populate('requestedBy', 'fullName email')
    .lean();
  return res.status(201).json(serializeDeletionRequest(populated, church, req.user?._id));
}

async function approveAdminTransactionDeletion(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const request = await TransactionDeletionRequest.findOne({
    _id: req.params.requestId,
    church: cid,
    status: 'PENDING',
  });
  if (!request) return res.status(404).json({ message: 'Pending deletion request not found' });

  const church = await loadChurchForDeletion(cid);
  const flags = userDeletionApprovalFlags(church, req.user?._id);
  if (!flags.canApproveAsTreasurer && !flags.canApproveAsViceTreasurer && !flags.canApproveAsDeacon) {
    return res.status(403).json({
      message: 'Only treasurer, vice treasurer, or deacon (moderator on main church) can approve deletions',
    });
  }

  applyDeletionApproval(request, church, req.user._id);

  if (areDeletionApprovalsComplete(request.approvals)) {
    try {
      await executeApprovedDeletion(request);
      request.status = 'COMPLETED';
      request.completedAt = new Date();
    } catch (e) {
      return res.status(e.statusCode || 500).json({ message: e.message || 'Failed to delete transaction' });
    }
  }

  await request.save();
  const populated = await TransactionDeletionRequest.findById(request._id)
    .populate('requestedBy', 'fullName email')
    .lean();
  return res.json(serializeDeletionRequest(populated, church, req.user?._id));
}

async function cancelAdminTransactionDeletion(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const request = await TransactionDeletionRequest.findOne({
    _id: req.params.requestId,
    church: cid,
    status: 'PENDING',
  });
  if (!request) return res.status(404).json({ message: 'Pending deletion request not found' });

  if (String(request.requestedBy) !== String(req.user?._id)) {
    return res.status(403).json({ message: 'Only the requester can cancel this deletion request' });
  }

  request.status = 'CANCELLED';
  await request.save();
  return res.status(204).send();
}

module.exports = {
  listAdminTransactionDeletions,
  requestAdminTransactionDeletion,
  approveAdminTransactionDeletion,
  cancelAdminTransactionDeletion,
};

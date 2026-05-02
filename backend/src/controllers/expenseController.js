const Expense = require('../models/Expense');
const Church = require('../models/Church');

function churchId(req) {
  return req.user?.church;
}

async function loadChurchLeadership(churchIdValue) {
  if (!churchIdValue) return null;
  return Church.findById(churchIdValue).select(
    'localLeadership.treasurer localLeadership.viceTreasurer localLeadership.viceSecretary localLeadership.secretary localLeadership.viceDeacon localLeadership.deacon'
  );
}

function toLeadershipRoleSet(church, userId) {
  const uid = String(userId || '');
  if (!church || !uid) return new Set();
  const roleSet = new Set();
  const leadership = church.localLeadership || {};
  if (String(leadership.viceTreasurer || '') === uid) roleSet.add('VICE_TREASURER');
  if (String(leadership.treasurer || '') === uid) roleSet.add('TREASURER');
  if (String(leadership.viceSecretary || '') === uid) roleSet.add('VICE_SECRETARY');
  if (String(leadership.secretary || '') === uid) roleSet.add('SECRETARY');
  if (String(leadership.viceDeacon || '') === uid) roleSet.add('VICE_DEACON');
  if (String(leadership.deacon || '') === uid) roleSet.add('DEACON');
  return roleSet;
}

function applyNoticeApproval(expense, roleSet) {
  const notice = expense.noticeApprovals || {};
  if (roleSet.has('VICE_SECRETARY')) notice.viceSecretary = true;
  if (roleSet.has('SECRETARY')) notice.secretary = true;
  if (roleSet.has('VICE_DEACON')) notice.viceDeacon = true;
  if (roleSet.has('DEACON')) notice.deacon = true;
  expense.noticeApprovals = notice;
}

function areAllNoticeApprovalsDone(expense) {
  const notice = expense.noticeApprovals || {};
  return Boolean(notice.viceSecretary && notice.secretary && notice.viceDeacon && notice.deacon);
}

function parseBody(body) {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    const e = new Error('Valid amount is required');
    e.statusCode = 400;
    throw e;
  }
  return {
    title: String(body?.title || '').trim(),
    amount,
    currency: String(body?.currency || 'USD')
      .trim()
      .toUpperCase() || 'USD',
    category: String(body?.category || 'OTHER').trim() || 'OTHER',
    description: String(body?.description || '').trim(),
    expenseDate: body?.expenseDate ? new Date(body.expenseDate) : new Date(),
  };
}

async function listAdminExpenses(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const church = await loadChurchLeadership(cid);
  const roleSet = toLeadershipRoleSet(church, req.user?._id);
  const rows = await Expense.find({ church: cid })
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName')
    .sort({ expenseDate: -1, createdAt: -1 });
  return res.json(
    rows.map((row) => ({
      ...(row.toObject ? row.toObject() : row),
      canCurrentUserInitiate: roleSet.has('VICE_TREASURER'),
      canCurrentUserVerify: roleSet.has('TREASURER'),
      canCurrentUserNoticeApprove:
        roleSet.has('VICE_SECRETARY') || roleSet.has('SECRETARY') || roleSet.has('VICE_DEACON') || roleSet.has('DEACON'),
    }))
  );
}

async function createAdminExpense(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const church = await loadChurchLeadership(cid);
  const roleSet = toLeadershipRoleSet(church, req.user?._id);
  if (!roleSet.has('VICE_TREASURER')) {
    return res.status(403).json({ message: 'Only vice treasurer can initiate a payment' });
  }
  const data = parseBody(req.body);
  if (!data.title) return res.status(400).json({ message: 'title is required' });
  const row = await Expense.create({
    ...data,
    church: cid,
    conference: req.user?.conferences?.[0] || null,
    createdBy: req.user._id,
    initiatedBy: req.user._id,
    approvalStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    approvalStage: 'PENDING_VERIFICATION',
    verifiedBy: null,
    verifiedAt: null,
    paymentNoticeCreatedAt: null,
    noticeApprovals: {
      viceSecretary: false,
      secretary: false,
      viceDeacon: false,
      deacon: false,
    },
  });
  const populated = await Expense.findById(row._id)
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.status(201).json(populated);
}

async function updateAdminExpense(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const church = await loadChurchLeadership(cid);
  const roleSet = toLeadershipRoleSet(church, req.user?._id);
  if (!roleSet.has('VICE_TREASURER')) {
    return res.status(403).json({ message: 'Only vice treasurer can edit initiated payments' });
  }
  const row = await Expense.findOne({ _id: req.params.expenseId, church: cid });
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  if (row.approvalStage === 'POSTED') {
    return res.status(400).json({ message: 'Posted expenses cannot be edited' });
  }
  if (req.body.title !== undefined) row.title = String(req.body.title).trim();
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.category !== undefined) row.category = String(req.body.category).trim();
  if (req.body.description !== undefined) row.description = String(req.body.description).trim();
  if (req.body.expenseDate !== undefined) row.expenseDate = new Date(req.body.expenseDate);
  row.approvalStatus = 'PENDING';
  row.approvedBy = null;
  row.approvedAt = null;
  row.approvalStage = 'PENDING_VERIFICATION';
  row.verifiedBy = null;
  row.verifiedAt = null;
  row.paymentNoticeCreatedAt = null;
  row.noticeApprovals = {
    viceSecretary: false,
    secretary: false,
    viceDeacon: false,
    deacon: false,
  };
  if (!row.title) return res.status(400).json({ message: 'title is required' });
  if (!Number.isFinite(row.amount) || row.amount < 0) return res.status(400).json({ message: 'Valid amount is required' });
  await row.save();
  const populated = await Expense.findById(row._id)
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.json(populated);
}

async function verifyAdminExpense(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const church = await loadChurchLeadership(cid);
  const roleSet = toLeadershipRoleSet(church, req.user?._id);
  if (!roleSet.has('TREASURER')) {
    return res.status(403).json({ message: 'Only treasurer can verify a payment' });
  }
  const row = await Expense.findOne({ _id: req.params.expenseId, church: cid });
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  if (row.approvalStage !== 'PENDING_VERIFICATION') {
    return res.status(400).json({ message: 'Payment must be in pending verification stage' });
  }
  row.approvalStatus = 'PENDING';
  row.approvalStage = 'PENDING_NOTICE_APPROVALS';
  row.verifiedBy = req.user._id;
  row.verifiedAt = new Date();
  row.paymentNoticeCreatedAt = new Date();
  await row.save();
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.json(populated);
}

async function approveAdminExpenseNotice(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const church = await loadChurchLeadership(cid);
  const roleSet = toLeadershipRoleSet(church, req.user?._id);
  const canNoticeApprove =
    roleSet.has('VICE_SECRETARY') || roleSet.has('SECRETARY') || roleSet.has('VICE_DEACON') || roleSet.has('DEACON');
  if (!canNoticeApprove) {
    return res.status(403).json({ message: 'Only vice secretary, secretary, vice deacon or deacon can approve payment notice' });
  }
  const row = await Expense.findOne({ _id: req.params.expenseId, church: cid });
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  if (row.approvalStage !== 'PENDING_NOTICE_APPROVALS') {
    return res.status(400).json({ message: 'Payment notice approval is not available for this expense' });
  }
  applyNoticeApproval(row, roleSet);
  if (areAllNoticeApprovalsDone(row)) {
    row.approvalStage = 'POSTED';
    row.approvalStatus = 'APPROVED';
    row.approvedBy = req.user._id;
    row.approvedAt = new Date();
  } else {
    row.approvalStatus = 'PENDING';
  }
  await row.save();
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.json(populated);
}

async function removeAdminExpense(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Expense.findOneAndDelete({ _id: req.params.expenseId, church: cid });
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  return res.status(204).send();
}

async function listSuperadminExpenses(req, res) {
  const churchFilter = String(req.query.churchId || '').trim();
  const conferenceFilter = String(req.query.conferenceId || '').trim();
  const statusFilter = String(req.query.approvalStatus || '').trim().toUpperCase();
  const q = {};
  if (churchFilter) {
    q.church = churchFilter;
  } else if (conferenceFilter) {
    const churchIds = await Church.find({ conference: conferenceFilter }).distinct('_id');
    q.$or = [{ church: { $in: churchIds } }, { conference: conferenceFilter }];
  }
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)) {
    q.approvalStatus = statusFilter;
  }
  const rows = await Expense.find(q)
    .populate('church', 'name')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName')
    .sort({ expenseDate: -1, createdAt: -1 });
  return res.json(rows);
}

async function getSuperadminExpense(req, res) {
  const row = await Expense.findById(req.params.expenseId)
    .populate('church', 'name conference')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  return res.json(row);
}

async function createSuperadminExpense(req, res) {
  const cid = String(req.body?.churchId || '').trim();
  if (!cid) return res.status(400).json({ message: 'Main church is required' });
  const church = await Church.findOne({ _id: cid, isActive: true, churchType: 'MAIN' }).select('_id conference');
  if (!church) return res.status(400).json({ message: 'Superadmin can add expenses only for main church' });
  const data = parseBody(req.body);
  if (!data.title) return res.status(400).json({ message: 'title is required' });
  const row = await Expense.create({
    ...data,
    church: church._id,
    conference: church.conference || null,
    createdBy: req.user._id,
    initiatedBy: req.user._id,
    approvalStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    approvalStage: 'PENDING_VERIFICATION',
    verifiedBy: null,
    verifiedAt: null,
    paymentNoticeCreatedAt: null,
    noticeApprovals: {
      viceSecretary: false,
      secretary: false,
      viceDeacon: false,
      deacon: false,
    },
  });
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.status(201).json(populated);
}

async function updateSuperadminExpense(req, res) {
  const row = await Expense.findById(req.params.expenseId);
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  if (req.body.churchId !== undefined) {
    const nextChurchId = String(req.body.churchId || '').trim();
    if (!nextChurchId) return res.status(400).json({ message: 'Main church is required' });
    const church = await Church.findOne({ _id: nextChurchId, isActive: true, churchType: 'MAIN' }).select(
      '_id conference'
    );
    if (!church) return res.status(400).json({ message: 'Superadmin can assign expenses only to main church' });
    row.church = church._id;
    row.conference = church.conference || null;
  }
  if (req.body.title !== undefined) row.title = String(req.body.title).trim();
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.category !== undefined) row.category = String(req.body.category).trim();
  if (req.body.description !== undefined) row.description = String(req.body.description).trim();
  if (req.body.expenseDate !== undefined) row.expenseDate = new Date(req.body.expenseDate);
  // Any edit restarts approval workflow to match local church process.
  row.approvalStatus = 'PENDING';
  row.approvedBy = null;
  row.approvedAt = null;
  row.approvalStage = 'PENDING_VERIFICATION';
  row.verifiedBy = null;
  row.verifiedAt = null;
  row.paymentNoticeCreatedAt = null;
  row.noticeApprovals = {
    viceSecretary: false,
    secretary: false,
    viceDeacon: false,
    deacon: false,
  };
  if (!row.title) return res.status(400).json({ message: 'title is required' });
  if (!Number.isFinite(row.amount) || row.amount < 0) return res.status(400).json({ message: 'Valid amount is required' });
  await row.save();
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.json(populated);
}

async function decideSuperadminExpenseApproval(req, res) {
  return res.status(403).json({
    message: 'Expense approval is now restricted to church treasurer or vice treasurer',
  });
}

async function removeSuperadminExpense(req, res) {
  const row = await Expense.findByIdAndDelete(req.params.expenseId);
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  return res.status(204).send();
}

module.exports = {
  listAdminExpenses,
  createAdminExpense,
  updateAdminExpense,
  verifyAdminExpense,
  approveAdminExpenseNotice,
  removeAdminExpense,
  listSuperadminExpenses,
  getSuperadminExpense,
  createSuperadminExpense,
  updateSuperadminExpense,
  decideSuperadminExpenseApproval,
  removeSuperadminExpense,
};

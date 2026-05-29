const Procurement = require('../models/Procurement');
const Expense = require('../models/Expense');
const Church = require('../models/Church');
const { getPaginationParams, paginatedResponse } = require('../utils/paginate');
const { normalizeDisplayCurrency, convertDisplayAmountToUsd } = require('../utils/displayCurrency');
const { attachExpenseLedger } = require('../utils/churchLedgerPosting');
const {
  buildRequiredApprovers,
  userCanManageProcurementDraft,
  allApprovalsComplete,
} = require('../utils/procurementLeadership');

function churchId(req) {
  return req.user?.church;
}

async function loadChurchForProcurement(churchIdValue) {
  if (!churchIdValue) return null;
  return Church.findById(churchIdValue).select('churchType conference localLeadership');
}

async function convertMoney(displayCurrency, amount) {
  const display = normalizeDisplayCurrency(displayCurrency);
  const amountInput = Number(amount);
  try {
    return await convertDisplayAmountToUsd(display, amountInput);
  } catch (e) {
    const err = new Error(e.message || 'Valid amount is required');
    err.statusCode = e.statusCode || 400;
    throw err;
  }
}

async function parseQuotations(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const q of raw) {
    const amountInput = Number(q?.amount);
    if (!Number.isFinite(amountInput) || amountInput < 0) continue;
    const conv = await convertMoney(q?.displayCurrency ?? q?.currency ?? 'USD', amountInput);
    out.push({
      supplierName: String(q?.supplierName || '').trim(),
      referenceNo: String(q?.referenceNo || '').trim(),
      amount: conv.amountDisplay,
      displayCurrency: conv.displayCurrency,
      amountUsd: conv.amountUsd,
      notes: String(q?.notes || '').trim(),
      isSelected: Boolean(q?.isSelected),
    });
  }
  return out;
}

async function parseBill(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const bill = {
    billNumber: String(raw.billNumber || '').trim(),
    referenceNo: String(raw.referenceNo || '').trim(),
    billDate: raw.billDate ? new Date(raw.billDate) : null,
    notes: String(raw.notes || '').trim(),
    displayCurrency: normalizeDisplayCurrency(raw.displayCurrency ?? raw.currency ?? 'USD'),
    amount: null,
    amountUsd: null,
  };
  if (raw.amount !== undefined && raw.amount !== null && raw.amount !== '') {
    const conv = await convertMoney(bill.displayCurrency, Number(raw.amount));
    bill.amount = conv.amountDisplay;
    bill.displayCurrency = conv.displayCurrency;
    bill.amountUsd = conv.amountUsd;
  }
  return bill;
}

function resolveSelectedQuotationId(procurement) {
  if (procurement.selectedQuotationId) {
    const hit = procurement.quotations.id(procurement.selectedQuotationId);
    if (hit) return hit._id;
  }
  const selected = procurement.quotations.find((q) => q.isSelected);
  return selected ? selected._id : null;
}

function resolvePostedAmount(procurement) {
  const billUsd = procurement.bill?.amountUsd;
  if (billUsd != null && Number.isFinite(Number(billUsd)) && Number(billUsd) > 0) {
    return Number(billUsd);
  }
  const qid = resolveSelectedQuotationId(procurement);
  const quote = qid ? procurement.quotations.id(qid) : null;
  if (quote?.amountUsd != null) return Number(quote.amountUsd);
  return null;
}

function syncLeadershipApprovals(procurement) {
  const existing = new Map((procurement.leadershipApprovals || []).map((a) => [a.roleKey, a]));
  procurement.leadershipApprovals = (procurement.requiredApprovers || []).map((req) => {
    const prev = existing.get(req.roleKey);
    return {
      roleKey: req.roleKey,
      roleLabel: req.roleLabel,
      userId: req.userId,
      approved: Boolean(prev?.approved),
      approvedAt: prev?.approvedAt || null,
      approvedBy: prev?.approvedBy || null,
    };
  });
}

function enrichProcurement(doc, church, userId) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const uid = String(userId || '');
  const canManage = userCanManageProcurementDraft(church, uid);
  const isDraft = obj.status === 'DRAFT';
  const isRejected = obj.status === 'REJECTED';
  const isPending = obj.status === 'PENDING_LEADERSHIP';
  const userSlots = (obj.requiredApprovers || []).filter((r) => String(r.userId) === uid);
  const approvalMap = new Map((obj.leadershipApprovals || []).map((a) => [a.roleKey, a]));
  const pendingForUser =
    isPending &&
    userSlots.some((s) => {
      const row = approvalMap.get(s.roleKey);
      return !row?.approved;
    });
  const approvedCount = (obj.leadershipApprovals || []).filter((a) => a.approved).length;
  const totalApprovals = (obj.requiredApprovers || []).length;
  return {
    ...obj,
    canCurrentUserEdit: (isDraft || isRejected) && canManage,
    canCurrentUserSubmit: (isDraft || isRejected) && canManage,
    canCurrentUserApprove: pendingForUser,
    canCurrentUserReject:
      isPending &&
      (canManage ||
        userSlots.length > 0 ||
        ['treasurer', 'viceTreasurer'].some(
          (k) => String(church?.localLeadership?.[k] || '') === uid
        )),
    approvalProgress: { approved: approvedCount, total: totalApprovals },
  };
}

async function finalizeProcurement(procurement, userId) {
  const amountUsd = resolvePostedAmount(procurement);
  if (!amountUsd || amountUsd <= 0) {
    const err = new Error('Select a quotation or enter a bill amount before posting');
    err.statusCode = 400;
    throw err;
  }
  const selectedId = resolveSelectedQuotationId(procurement);
  const quote = selectedId ? procurement.quotations.id(selectedId) : null;
  const refParts = [
    procurement.referenceNo ? `Ref: ${procurement.referenceNo}` : '',
    quote?.referenceNo ? `Quote ref: ${quote.referenceNo}` : '',
    procurement.bill?.referenceNo ? `Bill ref: ${procurement.bill.referenceNo}` : '',
    procurement.bill?.billNumber ? `Bill #: ${procurement.bill.billNumber}` : '',
  ].filter(Boolean);
  const description = [
    procurement.description || '',
    refParts.join(' · '),
    quote?.supplierName ? `Supplier: ${quote.supplierName}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  const expense = await Expense.create({
    church: procurement.church,
    conference: procurement.conference || null,
    title: `Procurement: ${procurement.title}`,
    amount: amountUsd,
    currency: 'USD',
    displayCurrency: quote?.displayCurrency || procurement.bill?.displayCurrency || 'USD',
    fxUsdPerUnit: 1,
    amountDisplayTotal: quote?.amount ?? procurement.bill?.amount ?? amountUsd,
    category: procurement.category || 'PROCUREMENT',
    description: description.slice(0, 2000),
    expenseDate: procurement.bill?.billDate || new Date(),
    createdBy: userId,
    approvalStatus: 'APPROVED',
    approvedBy: userId,
    approvedAt: new Date(),
    approvalStage: 'POSTED',
    initiatedBy: procurement.submittedBy || userId,
    verifiedBy: userId,
    verifiedAt: new Date(),
    paymentNoticeCreatedAt: new Date(),
    noticeApprovals: {
      viceSecretary: true,
      secretary: true,
      viceDeacon: true,
      deacon: true,
    },
    sourceProcurement: procurement._id,
  });

  await attachExpenseLedger({
    churchId: procurement.church,
    expenseDoc: expense,
    userId,
    paymentMethod: 'Cash',
  });

  procurement.status = 'POSTED';
  procurement.postedAt = new Date();
  procurement.postedBy = userId;
  procurement.expense = expense._id;
  procurement.journalEntry = expense.journalEntry || null;
  await procurement.save();
  return { procurement, expense };
}

async function listAdminProcurements(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { page, limit, skip } = getPaginationParams(req.query);
  const statusFilter = String(req.query.status || '').trim().toUpperCase();
  const q = { church: cid };
  if (['DRAFT', 'PENDING_LEADERSHIP', 'REJECTED', 'POSTED'].includes(statusFilter)) {
    q.status = statusFilter;
  }
  const church = await loadChurchForProcurement(cid);
  const [total, rows] = await Promise.all([
    Procurement.countDocuments(q),
    Procurement.find(q)
      .populate('createdBy', 'email fullName')
      .populate('expense', 'title amount receiptNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  return res.json(
    paginatedResponse(
      rows.map((row) => enrichProcurement(row, church, req.user?._id)),
      total,
      page,
      limit
    )
  );
}

async function getAdminProcurement(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Procurement.findOne({ _id: req.params.procurementId, church: cid })
    .populate('createdBy', 'email fullName')
    .populate('submittedBy', 'email fullName')
    .populate('expense', 'title amount receiptNumber expenseDate')
    .populate('requiredApprovers.userId', 'email fullName')
    .populate('leadershipApprovals.userId', 'email fullName')
    .populate('leadershipApprovals.approvedBy', 'email fullName');
  if (!row) return res.status(404).json({ message: 'Procurement not found' });
  const church = await loadChurchForProcurement(cid);
  return res.json(enrichProcurement(row, church, req.user?._id));
}

async function createAdminProcurement(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const church = await loadChurchForProcurement(cid);
  if (!userCanManageProcurementDraft(church, req.user?._id)) {
    return res.status(403).json({ message: 'Only treasurer, vice treasurer, or secretary can create procurement' });
  }
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ message: 'title is required' });
  let quotations = [];
  let bill = {};
  try {
    quotations = await parseQuotations(req.body?.quotations);
    bill = await parseBill(req.body?.bill);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid payload' });
  }
  const row = await Procurement.create({
    church: cid,
    conference: church?.conference || null,
    referenceNo: String(req.body?.referenceNo || '').trim(),
    title,
    description: String(req.body?.description || '').trim(),
    category: String(req.body?.category || 'PROCUREMENT').trim() || 'PROCUREMENT',
    status: 'DRAFT',
    quotations,
    bill,
    createdBy: req.user._id,
  });
  row.selectedQuotationId = resolveSelectedQuotationId(row);
  if (row.selectedQuotationId) await row.save();
  const populated = await Procurement.findById(row._id).populate('createdBy', 'email fullName');
  return res.status(201).json(enrichProcurement(populated, church, req.user?._id));
}

async function updateAdminProcurement(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Procurement.findOne({ _id: req.params.procurementId, church: cid });
  if (!row) return res.status(404).json({ message: 'Procurement not found' });
  const church = await loadChurchForProcurement(cid);
  if (!userCanManageProcurementDraft(church, req.user?._id)) {
    return res.status(403).json({ message: 'Only treasurer, vice treasurer, or secretary can edit procurement' });
  }
  if (!['DRAFT', 'REJECTED'].includes(row.status)) {
    return res.status(400).json({ message: 'Only draft or rejected procurement can be edited' });
  }
  if (req.body.title !== undefined) row.title = String(req.body.title).trim();
  if (req.body.referenceNo !== undefined) row.referenceNo = String(req.body.referenceNo).trim();
  if (req.body.description !== undefined) row.description = String(req.body.description).trim();
  if (req.body.category !== undefined) row.category = String(req.body.category).trim() || 'PROCUREMENT';
  if (req.body.quotations !== undefined) {
    try {
      row.quotations = await parseQuotations(req.body.quotations);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid quotations' });
    }
  }
  if (req.body.bill !== undefined) {
    try {
      row.bill = await parseBill(req.body.bill);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid bill' });
    }
  }
  if (req.body.selectedQuotationId !== undefined) {
    row.selectedQuotationId = req.body.selectedQuotationId || null;
  }
  if (row.status === 'REJECTED') {
    row.status = 'DRAFT';
    row.rejectionReason = '';
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.requiredApprovers = [];
    row.leadershipApprovals = [];
    row.submittedAt = null;
    row.submittedBy = null;
  }
  if (!row.title) return res.status(400).json({ message: 'title is required' });
  row.selectedQuotationId = resolveSelectedQuotationId(row);
  await row.save();
  const populated = await Procurement.findById(row._id).populate('createdBy', 'email fullName');
  return res.json(enrichProcurement(populated, church, req.user?._id));
}

async function submitAdminProcurement(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Procurement.findOne({ _id: req.params.procurementId, church: cid });
  if (!row) return res.status(404).json({ message: 'Procurement not found' });
  const church = await loadChurchForProcurement(cid);
  if (!userCanManageProcurementDraft(church, req.user?._id)) {
    return res.status(403).json({ message: 'Only treasurer, vice treasurer, or secretary can submit procurement' });
  }
  if (!['DRAFT', 'REJECTED'].includes(row.status)) {
    return res.status(400).json({ message: 'Procurement is not in draft' });
  }
  if (!String(row.referenceNo || '').trim()) {
    return res.status(400).json({ message: 'Reference number is required before submission' });
  }
  if (!row.quotations?.length) {
    return res.status(400).json({ message: 'Add at least one quotation before submission' });
  }
  row.selectedQuotationId = resolveSelectedQuotationId(row);
  if (!row.selectedQuotationId) {
    return res.status(400).json({ message: 'Select a quotation before submission' });
  }
  const required = buildRequiredApprovers(church);
  if (!required.length) {
    return res.status(400).json({
      message: 'Assign local church leadership before submitting procurement for approval',
    });
  }
  row.requiredApprovers = required;
  syncLeadershipApprovals(row);
  row.status = 'PENDING_LEADERSHIP';
  row.submittedAt = new Date();
  row.submittedBy = req.user._id;
  row.rejectionReason = '';
  row.rejectedBy = null;
  row.rejectedAt = null;
  await row.save();
  const populated = await Procurement.findById(row._id)
    .populate('createdBy', 'email fullName')
    .populate('requiredApprovers.userId', 'email fullName')
    .populate('leadershipApprovals.userId', 'email fullName');
  return res.json(enrichProcurement(populated, church, req.user?._id));
}

async function approveAdminProcurement(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Procurement.findOne({ _id: req.params.procurementId, church: cid });
  if (!row) return res.status(404).json({ message: 'Procurement not found' });
  if (row.status !== 'PENDING_LEADERSHIP') {
    return res.status(400).json({ message: 'Procurement is not awaiting leadership approval' });
  }
  const church = await loadChurchForProcurement(cid);
  const uid = String(req.user._id);
  const userSlots = (row.requiredApprovers || []).filter((r) => String(r.userId) === uid);
  if (!userSlots.length) {
    return res.status(403).json({ message: 'You are not assigned to approve this procurement' });
  }
  const approvalMap = new Map((row.leadershipApprovals || []).map((a) => [a.roleKey, { ...a }]));
  const now = new Date();
  for (const slot of userSlots) {
    const existing = approvalMap.get(slot.roleKey) || {
      roleKey: slot.roleKey,
      roleLabel: slot.roleLabel,
      userId: slot.userId,
      approved: false,
      approvedAt: null,
      approvedBy: null,
    };
    existing.approved = true;
    existing.approvedAt = now;
    existing.approvedBy = req.user._id;
    approvalMap.set(slot.roleKey, existing);
  }
  row.leadershipApprovals = Array.from(approvalMap.values());

  if (allApprovalsComplete(row.requiredApprovers, row.leadershipApprovals)) {
    try {
      await finalizeProcurement(row, req.user._id);
    } catch (e) {
      return res.status(e.statusCode || 500).json({ message: e.message || 'Failed to post procurement' });
    }
  } else {
    await row.save();
  }

  const populated = await Procurement.findById(row._id)
    .populate('createdBy', 'email fullName')
    .populate('expense', 'title amount receiptNumber')
    .populate('requiredApprovers.userId', 'email fullName')
    .populate('leadershipApprovals.userId', 'email fullName')
    .populate('leadershipApprovals.approvedBy', 'email fullName');
  return res.json(enrichProcurement(populated, church, req.user?._id));
}

async function rejectAdminProcurement(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Procurement.findOne({ _id: req.params.procurementId, church: cid });
  if (!row) return res.status(404).json({ message: 'Procurement not found' });
  if (row.status !== 'PENDING_LEADERSHIP') {
    return res.status(400).json({ message: 'Procurement is not awaiting approval' });
  }
  const church = await loadChurchForProcurement(cid);
  const enriched = enrichProcurement(row, church, req.user?._id);
  if (!enriched.canCurrentUserReject) {
    return res.status(403).json({ message: 'You cannot reject this procurement' });
  }
  row.status = 'REJECTED';
  row.rejectionReason = String(req.body?.reason || req.body?.rejectionReason || '').trim();
  row.rejectedBy = req.user._id;
  row.rejectedAt = new Date();
  await row.save();
  const populated = await Procurement.findById(row._id).populate('createdBy', 'email fullName');
  return res.json(enrichProcurement(populated, church, req.user?._id));
}

async function listSuperadminProcurements(req, res) {
  const churchFilter = String(req.query.churchId || '').trim();
  const conferenceFilter = String(req.query.conferenceId || '').trim();
  const statusFilter = String(req.query.status || '').trim().toUpperCase();
  const { page, limit, skip } = getPaginationParams(req.query);
  const q = {};
  if (churchFilter) {
    q.church = churchFilter;
  } else if (conferenceFilter) {
    const churchIds = await Church.find({ conference: conferenceFilter }).distinct('_id');
    q.church = { $in: churchIds };
  }
  if (['DRAFT', 'PENDING_LEADERSHIP', 'REJECTED', 'POSTED'].includes(statusFilter)) {
    q.status = statusFilter;
  }
  const [total, rows] = await Promise.all([
    Procurement.countDocuments(q),
    Procurement.find(q)
      .populate('church', 'name')
      .populate('createdBy', 'email fullName')
      .populate('expense', 'title amount receiptNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  return res.json(paginatedResponse(rows, total, page, limit));
}

async function getSuperadminProcurement(req, res) {
  const row = await Procurement.findById(req.params.procurementId)
    .populate('church', 'name churchType')
    .populate('createdBy', 'email fullName')
    .populate('submittedBy', 'email fullName')
    .populate('expense', 'title amount receiptNumber expenseDate')
    .populate('requiredApprovers.userId', 'email fullName')
    .populate('leadershipApprovals.userId', 'email fullName')
    .populate('leadershipApprovals.approvedBy', 'email fullName');
  if (!row) return res.status(404).json({ message: 'Procurement not found' });
  return res.json(row);
}

module.exports = {
  listAdminProcurements,
  getAdminProcurement,
  createAdminProcurement,
  updateAdminProcurement,
  submitAdminProcurement,
  approveAdminProcurement,
  rejectAdminProcurement,
  listSuperadminProcurements,
  getSuperadminProcurement,
};

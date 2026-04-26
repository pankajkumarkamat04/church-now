const Expense = require('../models/Expense');
const User = require('../models/User');
const Church = require('../models/Church');
const Conference = require('../models/Conference');

function churchId(req) {
  return req.user?.church;
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
  const rows = await Expense.find({ church: cid })
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName')
    .sort({ expenseDate: -1, createdAt: -1 });
  return res.json(rows);
}

async function createAdminExpense(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const data = parseBody(req.body);
  if (!data.title) return res.status(400).json({ message: 'title is required' });
  const row = await Expense.create({
    ...data,
    church: cid,
    conference: req.user?.conferences?.[0] || null,
    createdBy: req.user._id,
    approvalStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
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
  const row = await Expense.findOne({ _id: req.params.expenseId, church: cid });
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  if (req.body.title !== undefined) row.title = String(req.body.title).trim();
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.category !== undefined) row.category = String(req.body.category).trim();
  if (req.body.description !== undefined) row.description = String(req.body.description).trim();
  if (req.body.expenseDate !== undefined) row.expenseDate = new Date(req.body.expenseDate);
  row.approvalStatus = 'PENDING';
  row.approvedBy = null;
  row.approvedAt = null;
  if (!row.title) return res.status(400).json({ message: 'title is required' });
  if (!Number.isFinite(row.amount) || row.amount < 0) return res.status(400).json({ message: 'Valid amount is required' });
  await row.save();
  const populated = await Expense.findById(row._id)
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
  const conferenceId = String(req.body?.conferenceId || '').trim();
  let church = null;
  let conference = null;
  if (cid) {
    church = await Church.findOne({ _id: cid, isActive: true }).select('_id conference');
    if (!church) return res.status(404).json({ message: 'Church not found' });
  }
  if (conferenceId) {
    conference = await Conference.findOne({ _id: conferenceId, isActive: true }).select('_id');
    if (!conference) return res.status(404).json({ message: 'Conference not found' });
  }
  if (!church && !conference) {
    return res.status(400).json({ message: 'Please select church or conference scope' });
  }
  if (church && conference && String(church.conference || '') !== String(conference._id)) {
    return res.status(400).json({ message: 'Selected church does not belong to selected conference' });
  }
  const data = parseBody(req.body);
  if (!data.title) return res.status(400).json({ message: 'title is required' });
  const row = await Expense.create({
    ...data,
    church: church ? church._id : null,
    conference: conference ? conference._id : church?.conference || null,
    createdBy: req.user._id,
    approvalStatus: 'APPROVED',
    approvedBy: req.user._id,
    approvedAt: new Date(),
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
  if (req.body.churchId !== undefined || req.body.conferenceId !== undefined) {
    const nextChurchId =
      req.body.churchId !== undefined ? String(req.body.churchId || '').trim() : String(row.church || '');
    const nextConferenceId =
      req.body.conferenceId !== undefined
        ? String(req.body.conferenceId || '').trim()
        : String(row.conference || '');
    let church = null;
    let conference = null;
    if (nextChurchId) {
      church = await Church.findOne({ _id: nextChurchId, isActive: true }).select('_id conference');
      if (!church) return res.status(404).json({ message: 'Church not found' });
    }
    if (nextConferenceId) {
      conference = await Conference.findOne({ _id: nextConferenceId, isActive: true }).select('_id');
      if (!conference) return res.status(404).json({ message: 'Conference not found' });
    }
    if (!church && !conference) {
      return res.status(400).json({ message: 'Please select church or conference scope' });
    }
    if (church && conference && String(church.conference || '') !== String(conference._id)) {
      return res.status(400).json({ message: 'Selected church does not belong to selected conference' });
    }
    row.church = church ? church._id : null;
    row.conference = conference ? conference._id : church?.conference || null;
  }
  if (req.body.title !== undefined) row.title = String(req.body.title).trim();
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.category !== undefined) row.category = String(req.body.category).trim();
  if (req.body.description !== undefined) row.description = String(req.body.description).trim();
  if (req.body.expenseDate !== undefined) row.expenseDate = new Date(req.body.expenseDate);
  if (req.body.approvalStatus !== undefined) {
    const status = String(req.body.approvalStatus || '').toUpperCase();
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid approvalStatus' });
    }
    row.approvalStatus = status;
    if (status === 'APPROVED') {
      row.approvedBy = req.user._id;
      row.approvedAt = new Date();
    } else {
      row.approvedBy = null;
      row.approvedAt = null;
    }
  }
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
  const row = await Expense.findById(req.params.expenseId);
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  const status = String(req.body?.approvalStatus || '')
    .trim()
    .toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'approvalStatus must be APPROVED or REJECTED' });
  }
  row.approvalStatus = status;
  if (status === 'APPROVED') {
    row.approvedBy = req.user._id;
    row.approvedAt = new Date();
  } else {
    row.approvedBy = null;
    row.approvedAt = null;
  }
  await row.save();
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('conference', 'name conferenceId')
    .populate('createdBy', 'email fullName')
    .populate('approvedBy', 'email fullName');
  return res.json(populated);
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
  removeAdminExpense,
  listSuperadminExpenses,
  getSuperadminExpense,
  createSuperadminExpense,
  updateSuperadminExpense,
  decideSuperadminExpenseApproval,
  removeSuperadminExpense,
};

const Expense = require('../models/Expense');
const User = require('../models/User');
const Church = require('../models/Church');

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
    .populate('createdBy', 'email fullName')
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
    createdBy: req.user._id,
  });
  const populated = await Expense.findById(row._id).populate('createdBy', 'email fullName');
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
  if (!row.title) return res.status(400).json({ message: 'title is required' });
  if (!Number.isFinite(row.amount) || row.amount < 0) return res.status(400).json({ message: 'Valid amount is required' });
  await row.save();
  const populated = await Expense.findById(row._id).populate('createdBy', 'email fullName');
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
  const q = churchFilter ? { church: churchFilter } : {};
  const rows = await Expense.find(q)
    .populate('church', 'name')
    .populate('createdBy', 'email fullName')
    .sort({ expenseDate: -1, createdAt: -1 });
  return res.json(rows);
}

async function createSuperadminExpense(req, res) {
  const { churchId: cid } = req.body;
  if (!cid) return res.status(400).json({ message: 'churchId is required' });
  const church = await Church.findOne({ _id: cid, isActive: true }).select('_id');
  if (!church) return res.status(404).json({ message: 'Church not found' });
  const data = parseBody(req.body);
  if (!data.title) return res.status(400).json({ message: 'title is required' });
  const row = await Expense.create({
    ...data,
    church: cid,
    createdBy: req.user._id,
  });
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('createdBy', 'email fullName');
  return res.status(201).json(populated);
}

async function updateSuperadminExpense(req, res) {
  const row = await Expense.findById(req.params.expenseId);
  if (!row) return res.status(404).json({ message: 'Expense not found' });
  if (req.body.churchId !== undefined) {
    const c = await Church.findOne({ _id: req.body.churchId, isActive: true }).select('_id');
    if (!c) return res.status(404).json({ message: 'Church not found' });
    row.church = req.body.churchId;
  }
  if (req.body.title !== undefined) row.title = String(req.body.title).trim();
  if (req.body.amount !== undefined) row.amount = Number(req.body.amount);
  if (req.body.currency !== undefined) row.currency = String(req.body.currency).toUpperCase();
  if (req.body.category !== undefined) row.category = String(req.body.category).trim();
  if (req.body.description !== undefined) row.description = String(req.body.description).trim();
  if (req.body.expenseDate !== undefined) row.expenseDate = new Date(req.body.expenseDate);
  if (!row.title) return res.status(400).json({ message: 'title is required' });
  if (!Number.isFinite(row.amount) || row.amount < 0) return res.status(400).json({ message: 'Valid amount is required' });
  await row.save();
  const populated = await Expense.findById(row._id)
    .populate('church', 'name')
    .populate('createdBy', 'email fullName');
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
  createSuperadminExpense,
  updateSuperadminExpense,
  removeSuperadminExpense,
};

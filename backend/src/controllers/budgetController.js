const Budget = require('../models/Budget');
const { resolveChurchId } = require('../utils/accountingScope');
const { ensureTreasurerAccess } = require('../utils/treasurerAccess');

function churchRequired(req, res, allowQuery = false) {
  const cid = resolveChurchId(req, { allowQuery });
  if (!cid) {
    res.status(400).json({ message: 'Church context is required' });
    return null;
  }
  return cid;
}

async function getBudgets(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;
  const filter = { church: cid };
  const year = Number(req.query.year);
  if (Number.isFinite(year)) filter.year = year;
  if (req.query.period) filter.period = String(req.query.period);

  const budgets = await Budget.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('approvedBy', 'fullName email')
    .sort({ year: -1, createdAt: -1 });
  return res.json(budgets);
}

async function getBudgetById(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;
  const budget = await Budget.findOne({ _id: req.params.budgetId, church: cid })
    .populate('createdBy', 'fullName email')
    .populate('approvedBy', 'fullName email');
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  return res.json(budget);
}

async function createBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const { year, period, name, description, incomeCategories, expenseCategories, remarks, status } = req.body || {};
  if (!year || !name) {
    return res.status(400).json({ message: 'year and name are required' });
  }

  const budget = await Budget.create({
    church: cid,
    year: Number(year),
    period: period || 'Annual',
    name: String(name).trim(),
    description: description || '',
    incomeCategories: incomeCategories || [],
    expenseCategories: expenseCategories || [],
    remarks: remarks || '',
    status: status || 'Draft',
    createdBy: req.user._id,
  });

  return res.status(201).json(budget);
}

async function updateBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, church: cid });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });

  const { name, description, incomeCategories, expenseCategories, status, remarks } = req.body || {};
  if (name) budget.name = String(name).trim();
  if (description !== undefined) budget.description = String(description);
  if (incomeCategories) budget.incomeCategories = incomeCategories;
  if (expenseCategories) budget.expenseCategories = expenseCategories;
  if (status) budget.status = status;
  if (remarks !== undefined) budget.remarks = String(remarks);
  budget.lastModifiedBy = req.user._id;

  await budget.save();
  return res.json(budget);
}

async function approveBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, church: cid });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  await budget.approve(req.user._id);
  return res.json(budget);
}

async function activateBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, church: cid });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  try {
    await budget.activate();
  } catch (e) {
    return res.status(400).json({ message: e.message || 'Cannot activate budget' });
  }
  return res.json(budget);
}

async function refreshBudgetActuals(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, church: cid });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  await budget.updateActuals();
  return res.json(budget);
}

async function getBudgetSummary(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const filter = { church: cid };
  const year = Number(req.query.year);
  if (Number.isFinite(year)) filter.year = year;
  if (req.query.period) filter.period = String(req.query.period);

  const budgets = await Budget.find(filter);
  return res.json({
    totalBudgetedIncome: budgets.reduce((sum, b) => sum + b.totalIncomeBudget, 0),
    totalActualIncome: budgets.reduce((sum, b) => sum + b.totalActualIncome, 0),
    totalBudgetedExpense: budgets.reduce((sum, b) => sum + b.totalExpenseBudget, 0),
    totalActualExpense: budgets.reduce((sum, b) => sum + b.totalActualExpense, 0),
    activeBudgets: budgets.filter((b) => b.status === 'Active').length,
  });
}

async function getBudgetVsActualReport(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const year = Number(req.query.year) || new Date().getFullYear();
  const period = String(req.query.period || 'Annual');
  let budget = await Budget.findOne({
    church: cid,
    year,
    period,
    status: { $in: ['Active', 'Approved', 'Draft'] },
  }).sort({ status: -1, updatedAt: -1 });

  if (!budget) {
    return res.json({ budget: null, message: 'No budget found for this period' });
  }

  await budget.updateActuals();
  return res.json({ budget });
}

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  approveBudget,
  activateBudget,
  refreshBudgetActuals,
  getBudgetSummary,
  getBudgetVsActualReport,
};

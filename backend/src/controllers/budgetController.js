const Budget = require('../models/Budget');
const { BUDGET_OWNER_TYPES } = Budget;
const { resolveChurchId } = require('../utils/accountingScope');
const { ensureTreasurerAccess } = require('../utils/treasurerAccess');
const GlobalCouncil = require('../models/GlobalCouncil');
const CouncilRegion = require('../models/CouncilRegion');
const Conference = require('../models/Conference');
const Church = require('../models/Church');

function churchRequired(req, res, allowQuery = false) {
  const cid = resolveChurchId(req, { allowQuery });
  if (!cid) {
    res.status(400).json({ message: 'Church context is required' });
    return null;
  }
  return cid;
}

/**
 * Resolve budget owner from query/body.
 * ADMIN is always forced to CHURCH of their session.
 */
async function resolveBudgetOwner(req, res, { forCreate = false } = {}) {
  if (req.user?.role === 'ADMIN') {
    const cid = churchRequired(req, res, false);
    if (!cid) return null;
    return { ownerType: 'CHURCH', ownerId: cid, church: cid };
  }

  const ownerType = String(
    req.query?.ownerType || req.body?.ownerType || (req.query?.churchId || req.body?.churchId ? 'CHURCH' : '')
  )
    .trim()
    .toUpperCase();
  let ownerId = String(req.query?.ownerId || req.body?.ownerId || req.query?.churchId || req.body?.churchId || '').trim();

  if (!ownerType || !ownerId) {
    // Back-compat: if only churchId missing, require it for list
    if (!forCreate) {
      const cid = resolveChurchId(req, { allowQuery: true });
      if (cid) return { ownerType: 'CHURCH', ownerId: cid, church: cid };
    }
    res.status(400).json({
      message: 'ownerType and ownerId are required (or churchId for congregation budgets)',
    });
    return null;
  }

  if (!BUDGET_OWNER_TYPES.includes(ownerType)) {
    res.status(400).json({ message: `ownerType must be one of: ${BUDGET_OWNER_TYPES.join(', ')}` });
    return null;
  }

  if (ownerType === 'CHURCH') {
    const church = await Church.findById(ownerId).select('_id');
    if (!church) {
      res.status(400).json({ message: 'Church not found' });
      return null;
    }
    return { ownerType, ownerId, church: ownerId };
  }
  if (ownerType === 'COUNCIL') {
    const c = await GlobalCouncil.findById(ownerId).select('_id');
    if (!c) {
      res.status(400).json({ message: 'Council not found' });
      return null;
    }
    return { ownerType, ownerId, church: null };
  }
  if (ownerType === 'COUNCIL_REGION') {
    const r = await CouncilRegion.findById(ownerId).select('_id');
    if (!r) {
      res.status(400).json({ message: 'Council region not found' });
      return null;
    }
    return { ownerType, ownerId, church: null };
  }
  if (ownerType === 'CONFERENCE') {
    const conf = await Conference.findById(ownerId).select('_id');
    if (!conf) {
      res.status(400).json({ message: 'Conference not found' });
      return null;
    }
    return { ownerType, ownerId, church: null };
  }
  // NATIONAL — use a stable sentinel ObjectId from ownerId or a fixed national id string
  return { ownerType: 'NATIONAL', ownerId, church: null };
}

function ownerFilter(owner) {
  if (owner.ownerType === 'CHURCH') {
    return {
      $or: [
        { ownerType: 'CHURCH', ownerId: owner.ownerId },
        { church: owner.ownerId, $or: [{ ownerType: { $exists: false } }, { ownerType: 'CHURCH' }] },
      ],
    };
  }
  return { ownerType: owner.ownerType, ownerId: owner.ownerId };
}

async function getBudgets(req, res) {
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;
  const filter = ownerFilter(owner);
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
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;
  const budget = await Budget.findOne({ _id: req.params.budgetId, ...ownerFilter(owner) })
    .populate('createdBy', 'fullName email')
    .populate('approvedBy', 'fullName email');
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  return res.json(budget);
}

async function createBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const owner = await resolveBudgetOwner(req, res, { forCreate: true });
  if (!owner) return;

  const { year, period, name, description, incomeCategories, expenseCategories, remarks, status, currency } =
    req.body || {};
  if (!year || !name) {
    return res.status(400).json({ message: 'year and name are required' });
  }

  const budget = await Budget.create({
    ownerType: owner.ownerType,
    ownerId: owner.ownerId,
    church: owner.church,
    year: Number(year),
    period: period || 'Annual',
    name: String(name).trim(),
    description: description || '',
    currency: currency || 'USD',
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
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, ...ownerFilter(owner) });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });

  const { name, description, incomeCategories, expenseCategories, status, remarks, currency } = req.body || {};
  if (name) budget.name = String(name).trim();
  if (description !== undefined) budget.description = String(description);
  if (incomeCategories) budget.incomeCategories = incomeCategories;
  if (expenseCategories) budget.expenseCategories = expenseCategories;
  if (status) budget.status = status;
  if (remarks !== undefined) budget.remarks = String(remarks);
  if (currency !== undefined) budget.currency = String(currency || 'USD');
  budget.lastModifiedBy = req.user._id;

  await budget.save();
  return res.json(budget);
}

async function approveBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, ...ownerFilter(owner) });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  await budget.approve(req.user._id);
  return res.json(budget);
}

async function activateBudget(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, ...ownerFilter(owner) });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  try {
    await budget.activate();
  } catch (e) {
    return res.status(400).json({ message: e.message || 'Cannot activate budget' });
  }
  return res.json(budget);
}

async function refreshBudgetActuals(req, res) {
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;

  const budget = await Budget.findOne({ _id: req.params.budgetId, ...ownerFilter(owner) });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  await budget.updateActuals();
  return res.json(budget);
}

async function getBudgetSummary(req, res) {
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;

  const filter = ownerFilter(owner);
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
  const owner = await resolveBudgetOwner(req, res);
  if (!owner) return;

  const year = Number(req.query.year) || new Date().getFullYear();
  const period = String(req.query.period || 'Annual');
  let budget = await Budget.findOne({
    ...ownerFilter(owner),
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

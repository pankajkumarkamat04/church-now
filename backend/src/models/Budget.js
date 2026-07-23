const mongoose = require('mongoose');

const BUDGET_OWNER_TYPES = ['CHURCH', 'COUNCIL', 'COUNCIL_REGION', 'CONFERENCE', 'NATIONAL'];

const budgetCategorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    budgetedAmount: { type: Number, required: true, default: 0, min: 0 },
    actualAmount: { type: Number, default: 0, min: 0 },
    variance: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    /**
     * Budget owner (H-07). CHURCH remains the default; higher units use ownerType + ownerId.
     * `church` is kept for backward compatibility and for CHURCH owners.
     */
    ownerType: {
      type: String,
      enum: BUDGET_OWNER_TYPES,
      default: 'CHURCH',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      default: null,
      index: true,
    },
    year: { type: Number, required: true, index: true },
    period: {
      type: String,
      enum: ['Annual', 'Q1', 'Q2', 'Q3', 'Q4'],
      default: 'Annual',
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    currency: { type: String, trim: true, default: 'USD' },
    incomeCategories: { type: [budgetCategorySchema], default: [] },
    expenseCategories: { type: [budgetCategorySchema], default: [] },
    totalIncomeBudget: { type: Number, default: 0 },
    totalActualIncome: { type: Number, default: 0 },
    totalExpenseBudget: { type: Number, default: 0 },
    totalActualExpense: { type: Number, default: 0 },
    netBudget: { type: Number, default: 0 },
    netActual: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Approved', 'Active', 'Closed', 'Revised'],
      default: 'Draft',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedDate: { type: Date, default: null },
    revisionNumber: { type: Number, default: 1 },
    previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
    revisionReason: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    remarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

budgetSchema.index({ ownerType: 1, ownerId: 1, year: 1, period: 1 });
budgetSchema.index({ church: 1, year: 1, period: 1 });

budgetSchema.pre('validate', function syncOwnerChurch() {
  if (!this.ownerType) this.ownerType = 'CHURCH';
  if (this.ownerType === 'CHURCH') {
    if (!this.ownerId && this.church) this.ownerId = this.church;
    if (!this.church && this.ownerId) this.church = this.ownerId;
  }
  if (!this.ownerId && this.church) {
    this.ownerId = this.church;
    this.ownerType = 'CHURCH';
  }
});

budgetSchema.pre('save', async function preSaveTotals() {
  this.totalIncomeBudget = this.incomeCategories.reduce((sum, cat) => sum + cat.budgetedAmount, 0);
  this.totalActualIncome = this.incomeCategories.reduce((sum, cat) => sum + cat.actualAmount, 0);
  this.totalExpenseBudget = this.expenseCategories.reduce((sum, cat) => sum + cat.budgetedAmount, 0);
  this.totalActualExpense = this.expenseCategories.reduce((sum, cat) => sum + cat.actualAmount, 0);
  this.netBudget = this.totalIncomeBudget - this.totalExpenseBudget;
  this.netActual = this.totalActualIncome - this.totalActualExpense;
  this.incomeCategories.forEach((cat) => {
    cat.variance = cat.actualAmount - cat.budgetedAmount;
  });
  this.expenseCategories.forEach((cat) => {
    cat.variance = cat.budgetedAmount - cat.actualAmount;
  });
});

budgetSchema.methods.approve = function approve(userId) {
  this.status = 'Approved';
  this.approvedBy = userId;
  this.approvedDate = new Date();
  return this.save();
};

budgetSchema.methods.activate = function activate() {
  if (this.status !== 'Approved') {
    throw new Error('Budget must be approved before activation');
  }
  this.status = 'Active';
  return this.save();
};

budgetSchema.methods.updateActuals = async function updateActuals() {
  const Payment = mongoose.model('Payment');
  const Expense = mongoose.model('Expense');
  const Church = mongoose.model('Church');
  const User = mongoose.model('User');

  const year = this.year;
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const periodRanges = {
    Annual: [yearStart, yearEnd],
    Q1: [new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 3, 1))],
    Q2: [new Date(Date.UTC(year, 3, 1)), new Date(Date.UTC(year, 6, 1))],
    Q3: [new Date(Date.UTC(year, 6, 1)), new Date(Date.UTC(year, 9, 1))],
    Q4: [new Date(Date.UTC(year, 9, 1)), new Date(Date.UTC(year + 1, 0, 1))],
  };
  const [rangeStart, rangeEnd] = periodRanges[this.period] || periodRanges.Annual;

  let churchIds = [];
  const ownerType = this.ownerType || 'CHURCH';
  const ownerId = this.ownerId || this.church;

  if (ownerType === 'CHURCH') {
    churchIds = ownerId ? [ownerId] : [];
  } else if (ownerType === 'CONFERENCE') {
    const churches = await Church.find({ conference: ownerId, isActive: true }).select('_id').lean();
    churchIds = churches.map((c) => c._id);
  } else if (ownerType === 'NATIONAL') {
    const churches = await Church.find({ isActive: true }).select('_id').lean();
    churchIds = churches.map((c) => c._id);
  } else {
    const memberFilter =
      ownerType === 'COUNCIL_REGION' ? { councilRegionIds: ownerId } : { councilIds: ownerId };
    const members = await User.find(memberFilter).select('church').lean();
    churchIds = [
      ...new Set(members.map((m) => (m.church ? String(m.church) : '')).filter(Boolean)),
    ];
  }

  for (const cat of this.incomeCategories) {
    const categoryUpper = String(cat.category || '').trim().toUpperCase();
    if (churchIds.length === 0) {
      cat.actualAmount = 0;
      continue;
    }
    const payments = await Payment.find({
      church: { $in: churchIds },
      paidAt: { $gte: rangeStart, $lt: rangeEnd },
      'paymentLines.paymentType': categoryUpper,
    }).lean();
    let total = 0;
    for (const payment of payments) {
      for (const line of payment.paymentLines || []) {
        if (String(line.paymentType || '').toUpperCase() === categoryUpper) {
          total += Number(line.amount || 0);
        }
      }
    }
    cat.actualAmount = Math.round(total * 100) / 100;
  }

  for (const cat of this.expenseCategories) {
    const categoryMatch = new RegExp(`^${String(cat.category || '').trim()}$`, 'i');
    const expenseOr = [{ approvalStage: 'POSTED' }, { approvalStatus: 'APPROVED' }];
    const match = {
      expenseDate: { $gte: rangeStart, $lt: rangeEnd },
      category: categoryMatch,
      $or: expenseOr,
    };
    if (ownerType === 'CONFERENCE' && ownerId) {
      match.$and = [
        { $or: expenseOr },
        {
          $or: [
            { conference: ownerId },
            ...(churchIds.length ? [{ church: { $in: churchIds } }] : []),
          ],
        },
      ];
      delete match.$or;
    } else if (churchIds.length === 0) {
      cat.actualAmount = 0;
      continue;
    } else {
      match.church = { $in: churchIds };
    }
    const result = await Expense.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    cat.actualAmount = result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
  }

  return this.save();
};

module.exports = mongoose.model('Budget', budgetSchema);
module.exports.BUDGET_OWNER_TYPES = BUDGET_OWNER_TYPES;

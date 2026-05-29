const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
    accountCode: String,
    accountName: String,
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    entryNumber: { type: String, required: true, trim: true },
    entryDate: { type: Date, required: true, default: Date.now },
    referenceType: {
      type: String,
      enum: [
        'Wallet Deposit',
        'Member Payment',
        'Direct Payment',
        'Expense',
        'Remittance',
        'Income',
        'Receipt',
        'Payment',
        'Manual',
        'Adjustment',
        'Other',
      ],
    },
    currency: { type: String, enum: ['USD', 'ZAR', 'ZWG'], default: 'USD' },
    referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' },
    referenceModel: {
      type: String,
      enum: ['Payment', 'Expense', 'MemberBalanceDeposit', 'ChurchRemittance'],
    },
    referenceNumber: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true },
    lines: { type: [journalLineSchema], default: [] },
    totalDebit: { type: Number, required: true, default: 0 },
    totalCredit: { type: Number, required: true, default: 0 },
    periodYear: { type: Number, required: true, index: true },
    period: {
      type: String,
      enum: ['Annual', 'Q1', 'Q2', 'Q3', 'Q4'],
      default: 'Annual',
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending Authorization', 'Posted', 'Reversed', 'Rejected'],
      default: 'Draft',
      index: true,
    },
    postedDate: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: '' },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedDate: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

journalEntrySchema.index({ church: 1, entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ church: 1, entryDate: -1 });
journalEntrySchema.index({ church: 1, periodYear: 1, period: 1 });

journalEntrySchema.pre('save', async function preSaveBalanceCheck() {
  this.totalDebit = Math.round(this.lines.reduce((sum, line) => sum + line.debit, 0) * 100) / 100;
  this.totalCredit = Math.round(this.lines.reduce((sum, line) => sum + line.credit, 0) * 100) / 100;
  if (this.totalDebit !== this.totalCredit) {
    throw new Error(`Journal entry must balance. Debit: ${this.totalDebit}, Credit: ${this.totalCredit}`);
  }
});

journalEntrySchema.methods.post = async function postEntry() {
  if (this.status === 'Posted') {
    throw new Error('Journal entry is already posted');
  }
  const LedgerAccount = mongoose.model('LedgerAccount');
  for (const line of this.lines) {
    const account = await LedgerAccount.findById(line.account);
    if (!account) continue;
    if (line.debit > 0) await account.updateBalance(line.debit, 'debit');
    if (line.credit > 0) await account.updateBalance(line.credit, 'credit');
  }
  this.status = 'Posted';
  this.postedDate = new Date();
  return this.save();
};

journalEntrySchema.statics.generateEntryNumber = async function generateEntryNumber(churchId, year) {
  const count = await this.countDocuments({
    church: churchId,
    entryNumber: new RegExp(`^JE-${year}-`),
  });
  return `JE-${year}-${String(count + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('JournalEntry', journalEntrySchema);

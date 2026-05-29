const mongoose = require('mongoose');

const ledgerAccountSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    accountCode: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
      required: true,
    },
    accountCategory: { type: String, required: true, trim: true },
    parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount', default: null },
    balance: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    openingBalanceDate: { type: Date, default: null },
    normalBalance: { type: String, enum: ['Debit', 'Credit'], required: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    isSystemAccount: { type: Boolean, default: false },
    currency: { type: String, enum: ['USD', 'ZAR', 'ZWG'], default: 'USD' },
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    isControlAccount: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

ledgerAccountSchema.index({ church: 1, accountCode: 1 }, { unique: true });
ledgerAccountSchema.index({ church: 1, accountType: 1 });
ledgerAccountSchema.index({ church: 1, isActive: 1 });

ledgerAccountSchema.methods.updateBalance = function updateBalance(amount, type) {
  if (this.normalBalance === 'Debit') {
    this.balance += type === 'debit' ? amount : -amount;
  } else {
    this.balance += type === 'credit' ? amount : -amount;
  }
  return this.save();
};

module.exports = mongoose.model('LedgerAccount', ledgerAccountSchema);

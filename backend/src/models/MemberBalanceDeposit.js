const mongoose = require('mongoose');

const memberBalanceDepositSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Stored in USD (treasurer wallet credit). */
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 8 },
    displayCurrency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 8 },
    fxUsdPerUnit: { type: Number, default: 1, min: 0 },
    amountDisplay: { type: Number, default: null },
    depositedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    depositedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'Cash',
      maxlength: 64,
    },
    receiptNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MemberBalanceDeposit', memberBalanceDepositSchema);

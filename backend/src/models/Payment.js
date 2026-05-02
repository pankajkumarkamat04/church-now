const mongoose = require('mongoose');

const PAYMENT_OPTIONS = [
  'TITHE',
  'BUILDING',
  'ROOF',
  'GAZALAND',
  'UTC',
  'THANKS',
  'MUSIC',
  'XMAS',
  'HARVEST',
];

const paymentLineSchema = new mongoose.Schema(
  {
    paymentType: {
      type: String,
      enum: PAYMENT_OPTIONS,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    paymentLines: {
      type: [paymentLineSchema],
      default: [],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Canonical amounts are always stored in USD. */
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'USD',
      maxlength: 8,
    },
    /** Currency used when entering amounts (USD, ZAR, ZWG); display-only context. */
    displayCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'USD',
      maxlength: 8,
    },
    /** USD value of one unit of displayCurrency at transaction time (1 for USD). */
    fxUsdPerUnit: { type: Number, default: 1, min: 0 },
    /** Total amount as entered in displayCurrency (optional audit snapshot). */
    amountDisplayTotal: { type: Number, default: null },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['MEMBER', 'ADMIN', 'SUPERADMIN', 'PUBLIC'],
      required: true,
      default: 'MEMBER',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    donorName: {
      type: String,
      trim: true,
      default: '',
    },
    donorEmail: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = {
  Payment: mongoose.model('Payment', paymentSchema),
  PAYMENT_OPTIONS,
};

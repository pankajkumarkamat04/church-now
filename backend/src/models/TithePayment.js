const mongoose = require('mongoose');

const tithePaymentSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    monthKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}$/,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'USD',
      maxlength: 8,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

tithePaymentSchema.index({ user: 1, church: 1, monthKey: 1 }, { unique: true });

module.exports = mongoose.model('TithePayment', tithePaymentSchema);

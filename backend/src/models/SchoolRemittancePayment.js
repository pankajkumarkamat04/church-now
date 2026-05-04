const mongoose = require('mongoose');

const schoolRemittancePaymentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolRemittanceSchool',
      required: true,
      index: true,
    },
    due: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolRemittanceDue',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    referenceNo: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

schoolRemittancePaymentSchema.index({ school: 1, paidAt: -1 });

module.exports = mongoose.model('SchoolRemittancePayment', schoolRemittancePaymentSchema);

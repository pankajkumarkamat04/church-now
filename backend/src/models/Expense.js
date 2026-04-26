const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      default: null,
      index: true,
    },
    conference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conference',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 8 },
    category: { type: String, trim: true, default: 'OTHER', maxlength: 64 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    expenseDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);

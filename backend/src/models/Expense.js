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
    /** Canonical; amounts are always USD. */
    currency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 8 },
    displayCurrency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 8 },
    fxUsdPerUnit: { type: Number, default: 1, min: 0 },
    amountDisplayTotal: { type: Number, default: null },
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
    approvalStage: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'PENDING_NOTICE_APPROVALS', 'POSTED'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    paymentNoticeCreatedAt: { type: Date, default: null },
    noticeApprovals: {
      viceSecretary: { type: Boolean, default: false },
      secretary: { type: Boolean, default: false },
      viceDeacon: { type: Boolean, default: false },
      deacon: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);

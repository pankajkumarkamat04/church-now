const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema(
  {
    supplierName: { type: String, trim: true, default: '' },
    referenceNo: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    displayCurrency: { type: String, trim: true, uppercase: true, default: 'USD' },
    amountUsd: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '', maxlength: 2000 },
    isSelected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const billSchema = new mongoose.Schema(
  {
    billNumber: { type: String, trim: true, default: '' },
    referenceNo: { type: String, trim: true, default: '' },
    billDate: { type: Date, default: null },
    amount: { type: Number, min: 0, default: null },
    displayCurrency: { type: String, trim: true, uppercase: true, default: 'USD' },
    amountUsd: { type: Number, min: 0, default: null },
    notes: { type: String, trim: true, default: '', maxlength: 2000 },
  },
  { _id: false }
);

const approvalSlotSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true },
    roleLabel: { type: String, trim: true, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const procurementSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    conference: { type: mongoose.Schema.Types.ObjectId, ref: 'Conference', default: null },
    referenceNo: { type: String, trim: true, default: '', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    category: { type: String, trim: true, default: 'PROCUREMENT', maxlength: 64 },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_LEADERSHIP', 'REJECTED', 'POSTED'],
      default: 'DRAFT',
      index: true,
    },
    quotations: { type: [quotationSchema], default: [] },
    selectedQuotationId: { type: mongoose.Schema.Types.ObjectId, default: null },
    bill: { type: billSchema, default: () => ({}) },
    requiredApprovers: {
      type: [
        {
          roleKey: String,
          roleLabel: String,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      default: [],
    },
    leadershipApprovals: { type: [approvalSlotSchema], default: [] },
    rejectionReason: { type: String, trim: true, default: '' },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    postedAt: { type: Date, default: null },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

procurementSchema.index({ church: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Procurement', procurementSchema);

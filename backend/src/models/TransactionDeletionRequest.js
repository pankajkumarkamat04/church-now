const mongoose = require('mongoose');

const transactionDeletionRequestSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    targetKind: {
      type: String,
      enum: ['PAYMENT', 'EXPENSE', 'REMITTANCE'],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: { type: String, trim: true, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvals: {
      treasurer: { type: Boolean, default: false },
      viceTreasurer: { type: Boolean, default: false },
      deacon: { type: Boolean, default: false },
    },
    approvedBy: {
      treasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      viceTreasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      deacon: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

transactionDeletionRequestSchema.index(
  { targetKind: 1, targetId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

module.exports = mongoose.model('TransactionDeletionRequest', transactionDeletionRequestSchema);

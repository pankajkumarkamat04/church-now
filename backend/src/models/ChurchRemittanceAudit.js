const mongoose = require('mongoose');

const churchRemittanceAuditSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChurchRemittance',
      default: null,
      index: true,
    },
    monthKey: {
      type: String,
      trim: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      index: true,
    },
    remitType: {
      type: String,
      enum: ['MAIN_CHURCH', 'CONFERENCE', null],
      default: null,
    },
    amount: { type: Number, default: null },
    action: {
      type: String,
      enum: ['CREATED', 'UPDATED', 'DELETE_REQUESTED', 'DELETE_APPROVED', 'DELETED'],
      required: true,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    details: { type: String, trim: true, default: '', maxlength: 1000 },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

churchRemittanceAuditSchema.index({ church: 1, at: -1 });

module.exports = mongoose.model('ChurchRemittanceAudit', churchRemittanceAuditSchema);

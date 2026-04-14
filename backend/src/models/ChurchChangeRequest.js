const mongoose = require('mongoose');

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const churchChangeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromChurch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
    },
    toChurch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'PENDING',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChurchChangeRequest', churchChangeRequestSchema);
module.exports.STATUSES = STATUSES;

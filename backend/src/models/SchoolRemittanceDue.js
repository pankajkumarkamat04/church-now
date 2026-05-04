const mongoose = require('mongoose');

const schoolRemittanceDueSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolRemittanceSchool',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 3000,
      index: true,
    },
    termKey: {
      type: String,
      enum: ['TERM_1', 'TERM_2', 'TERM_3', 'CUSTOM'],
      default: 'CUSTOM',
      index: true,
    },
    label: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID'],
      default: 'PENDING',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

schoolRemittanceDueSchema.index({ school: 1, year: 1, label: 1 }, { unique: true });

module.exports = mongoose.model('SchoolRemittanceDue', schoolRemittanceDueSchema);

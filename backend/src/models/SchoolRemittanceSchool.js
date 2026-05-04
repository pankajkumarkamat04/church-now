const mongoose = require('mongoose');

const schoolRemittanceSchoolSchema = new mongoose.Schema(
  {
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolProfile',
      required: true,
      index: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SchoolRemittanceSchool', schoolRemittanceSchoolSchema);

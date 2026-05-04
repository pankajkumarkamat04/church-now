const mongoose = require('mongoose');

const schoolProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      unique: true,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
      maxlength: 160,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      maxlength: 160,
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model('SchoolProfile', schoolProfileSchema);

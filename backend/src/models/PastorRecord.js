const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    roleTitle: { type: String, trim: true, default: '' },
    churchName: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    provider: { type: String, trim: true, default: '' },
    date: { type: Date, default: null },
    certificateRef: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const pastorRecordSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    personal: {
      fullName: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      contactPhone: { type: String, trim: true, default: '' },
      addressText: { type: String, trim: true, default: '' },
    },
    credentials: {
      ordinationDate: { type: Date, default: null },
      denomination: { type: String, trim: true, default: '' },
      qualifications: [{ type: String, trim: true }],
    },
    assignmentHistory: { type: [assignmentSchema], default: [] },
    contactSchedule: {
      availability: { type: String, trim: true, default: '' },
      officeHours: { type: String, trim: true, default: '' },
      emergencyContactName: { type: String, trim: true, default: '' },
      emergencyContactPhone: { type: String, trim: true, default: '' },
    },
    trainings: { type: [trainingSchema], default: [] },
    confidentialNotes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pastorRecordSchema.index({ church: 1, member: 1 }, { unique: true });

module.exports = mongoose.model('PastorRecord', pastorRecordSchema);

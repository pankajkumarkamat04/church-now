const mongoose = require('mongoose');

const personalSchema = new mongoose.Schema(
  {
    /** Display / legal name (Reverend/Pastor record) */
    name: { type: String, trim: true, default: '' },
    /** e.g. Reverend, Pastor, Dr. */
    title: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    /** @deprecated use name; kept for existing records */
    fullName: { type: String, trim: true, default: '' },
    /** @deprecated use contactEmail */
    email: { type: String, trim: true, lowercase: true, default: '' },
    /** @deprecated use address */
    addressText: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const credentialsSchema = new mongoose.Schema(
  {
    ordinationDate: { type: Date, default: null },
    denomination: { type: String, trim: true, default: '' },
    qualifications: [{ type: String, trim: true }],
  },
  { _id: false }
);

const pastorRecordSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    personal: { type: personalSchema, default: () => ({}) },
    /** Primary role label for this record (e.g. Lead pastor) */
    currentRole: { type: String, trim: true, default: '' },
    credentials: { type: credentialsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pastorRecordSchema.index({ church: 1, member: 1 }, { unique: true });

module.exports = mongoose.model('PastorRecord', pastorRecordSchema);

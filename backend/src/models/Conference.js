const mongoose = require('mongoose');

const conferenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    conferenceId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    officeAddress: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    stateOrProvince: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    contactPerson: { type: String, trim: true, default: '' },
    leadership: {
      churchBishop: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      secretary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      treasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      superintendents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      president: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conference', conferenceSchema);

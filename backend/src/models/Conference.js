const mongoose = require('mongoose');

const conferenceLeadershipSchema = new mongoose.Schema(
  {
    superintendent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceSuperintendent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceModerator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    secretary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceSecretary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    treasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceTreasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    conferenceMinister1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    conferenceMinister2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const conferenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    conferenceId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    officeAddress: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    stateOrProvince: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    localLeadership: { type: conferenceLeadershipSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conference', conferenceSchema);

const mongoose = require('mongoose');

const localLeadershipSchema = new mongoose.Schema(
  {
    spiritualPastor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    churchPresident: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    vicePresident: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceModerator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    superintendent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceSuperintendent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    conferenceMinister1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    conferenceMinister2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    minister: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deacon: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceDeacon: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    secretary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceSecretary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    treasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viceTreasurer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    committeeMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const councilRoleSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true, trim: true },
    roleLabel: { type: String, trim: true, default: '' },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const churchCouncilSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    roles: [councilRoleSchema],
  },
  { timestamps: false }
);

const serviceCouncilSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const churchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    churchType: { type: String, enum: ['MAIN', 'SUB'], default: 'MAIN', index: true },
    conference: { type: mongoose.Schema.Types.ObjectId, ref: 'Conference', default: null, index: true },
    mainChurch: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null, index: true },
    localLeadership: { type: localLeadershipSchema, default: () => ({}) },
    councils: { type: [churchCouncilSchema], default: [] },
    serviceCouncils: { type: [serviceCouncilSchema], default: [] },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    stateOrProvince: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Church', churchSchema);

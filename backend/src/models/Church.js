const mongoose = require('mongoose');

const churchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    churchType: { type: String, enum: ['MAIN', 'SUB'], default: 'MAIN', index: true },
    conference: { type: mongoose.Schema.Types.ObjectId, ref: 'Conference', default: null, index: true },
    mainChurch: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null, index: true },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    stateOrProvince: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    contactPerson: { type: String, trim: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Church', churchSchema);

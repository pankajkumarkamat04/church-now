const mongoose = require('mongoose');

const ASSET_CATEGORIES = [
  'PROPERTY',
  'MOTOR_VEHICLE',
  'FARM',
  'LAND',
  'BUILDING',
  'EQUIPMENT',
  'FURNITURE',
  'OTHER',
];

const ASSET_STATUSES = ['ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE', 'SOLD', 'DISPOSED'];
const OWNERSHIP_TYPES = ['OWNED', 'LEASED', 'DONATED'];

const assetSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ASSET_CATEGORIES, default: 'OTHER', index: true },
    status: { type: String, enum: ASSET_STATUSES, default: 'ACTIVE', index: true },
    ownershipType: { type: String, enum: OWNERSHIP_TYPES, default: 'OWNED' },
    location: { type: String, trim: true, default: '' },
    registrationNumber: { type: String, trim: true, default: '' },
    acquisitionDate: { type: Date, default: null },
    acquisitionCost: { type: Number, default: null },
    currentEstimatedValue: { type: Number, default: null },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

assetSchema.index({ church: 1, category: 1, status: 1, name: 1 });

module.exports = mongoose.model('Asset', assetSchema);
module.exports.ASSET_CATEGORIES = ASSET_CATEGORIES;
module.exports.ASSET_STATUSES = ASSET_STATUSES;
module.exports.OWNERSHIP_TYPES = OWNERSHIP_TYPES;

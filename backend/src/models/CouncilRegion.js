const mongoose = require('mongoose');

/**
 * Council region (e.g. CYF regions) — separate from church conferences.
 * A member can belong to a church/conference and a council region at the same time.
 */
const councilRegionSchema = new mongoose.Schema(
  {
    council: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalCouncil',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    effectiveFrom: { type: Date, default: null },
    effectiveTo: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

councilRegionSchema.index({ council: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CouncilRegion', councilRegionSchema);

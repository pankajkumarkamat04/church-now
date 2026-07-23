const mongoose = require('mongoose');

const globalCouncilSchema = new mongoose.Schema(
  {
    /** Official display name (title case), e.g. "Christian Youth Fellowship". */
    name: { type: String, required: true, trim: true, unique: true },
    /** Short official abbreviation, e.g. "CYF". */
    abbreviation: { type: String, trim: true, default: '', uppercase: true },
    /** Display order in forms and reports (lower first). */
    displayOrder: { type: Number, default: 100, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

globalCouncilSchema.index({ displayOrder: 1, name: 1 });

module.exports = mongoose.model('GlobalCouncil', globalCouncilSchema);

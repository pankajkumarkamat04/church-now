const mongoose = require('mongoose');

const councilSchema = new mongoose.Schema(
  {
    conference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conference',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    leadership: {
      churchBishop: { type: String, trim: true, default: '' },
      moderator: { type: String, trim: true, default: '' },
      secretary: { type: String, trim: true, default: '' },
      treasurer: { type: String, trim: true, default: '' },
      superintendents: [{ type: String, trim: true }],
      president: { type: String, trim: true, default: '' },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Council', councilSchema);

const mongoose = require('mongoose');

const pastorTermSchema = new mongoose.Schema(
  {
    pastor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    termNumber: { type: Number, enum: [1, 2], default: 1 },
    termStart: { type: Date, required: true },
    termEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED', 'TRANSFERRED'],
      default: 'ASSIGNED',
      index: true,
    },
    transferredToChurch: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null },
    renewalHistory: [{ renewedAt: { type: Date, required: true }, renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }],
  },
  { timestamps: true }
);

pastorTermSchema.index({ pastor: 1, church: 1, status: 1 });

module.exports = mongoose.model('PastorTerm', pastorTermSchema);

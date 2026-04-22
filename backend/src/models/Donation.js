const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    donorName: { type: String, trim: true, default: '' },
    donorEmail: { type: String, trim: true, default: '' },
    donorPhone: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 8 },
    note: { type: String, trim: true, default: '', maxlength: 500 },
    donatedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['PUBLIC', 'MEMBER'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donation', donationSchema);

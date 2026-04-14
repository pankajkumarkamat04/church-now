const mongoose = require('mongoose');

const STATUSES = ['ACTIVE', 'CANCELLED'];

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    status: { type: String, enum: STATUSES, default: 'ACTIVE' },
    monthlyPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true, trim: true },
    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
module.exports.SUBSCRIPTION_STATUSES = STATUSES;

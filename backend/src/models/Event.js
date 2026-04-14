const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    excerpt: { type: String, default: '' },
    description: { type: String, default: '' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    location: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    published: { type: Boolean, default: true },
    featuredOnHome: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ church: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Event', eventSchema);

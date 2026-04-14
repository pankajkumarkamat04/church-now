const mongoose = require('mongoose');

const conferenceForumPostSchema = new mongoose.Schema(
  {
    conference: { type: mongoose.Schema.Types.ObjectId, ref: 'Conference', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

conferenceForumPostSchema.index({ conference: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('ConferenceForumPost', conferenceForumPostSchema);

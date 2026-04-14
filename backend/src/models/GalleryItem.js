const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    title: { type: String, default: '', trim: true },
    imageUrl: { type: String, required: true, trim: true },
    caption: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GalleryItem', galleryItemSchema);

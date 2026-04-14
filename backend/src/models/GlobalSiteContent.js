const mongoose = require('mongoose');

/** Singleton public-site copy shared by every church. */
const globalSiteContentSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    heroImageUrl: { type: String, default: '' },
    miniAboutTitle: { type: String, default: 'About us' },
    miniAboutText: { type: String, default: '' },
    miniAboutImageUrl: { type: String, default: '' },
    aboutPageTitle: { type: String, default: 'About us' },
    aboutPageBody: { type: String, default: '' },
    contactHeading: { type: String, default: 'Contact' },
    contactIntro: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GlobalSiteContent', globalSiteContentSchema);

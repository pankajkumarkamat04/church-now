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
    aboutBox1Title: { type: String, default: 'Plain and clear' },
    aboutBox1Text: { type: String, default: 'Interfaces that stay out of the way.' },
    aboutBox2Title: { type: String, default: 'Roles that fit' },
    aboutBox2Text: { type: String, default: 'Superadmin, church admin, and member views.' },
    aboutBox3Title: { type: String, default: 'Life together' },
    aboutBox3Text: { type: String, default: 'Events and photos tell your story.' },
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

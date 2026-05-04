const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: 'default', unique: true, index: true },
    systemName: { type: String, trim: true, default: 'Church OS' },
    systemLogoUrl: { type: String, trim: true, default: '' },
    supportEmail: { type: String, trim: true, lowercase: true, default: '' },
    supportPhone: { type: String, trim: true, default: '' },
    websiteUrl: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    footerText: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);

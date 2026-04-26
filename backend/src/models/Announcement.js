const mongoose = require('mongoose');

const ANNOUNCEMENT_SCOPES = ['SYSTEM', 'CHURCH'];
const ANNOUNCEMENT_TARGET_ROLES = [
  'SUPERADMIN',
  'ADMIN',
  'MEMBER',
  'TREASURER',
  'VICE_TREASURER',
  'SECRETARY',
  'VICE_SECRETARY',
  'DEACON',
  'VICE_DEACON',
];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    scope: { type: String, enum: ANNOUNCEMENT_SCOPES, default: 'CHURCH', index: true },
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null, index: true },
    targetRoles: [{ type: String, enum: ANNOUNCEMENT_TARGET_ROLES }],
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByRole: { type: String, required: true, trim: true, maxlength: 24 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
module.exports.ANNOUNCEMENT_SCOPES = ANNOUNCEMENT_SCOPES;
module.exports.ANNOUNCEMENT_TARGET_ROLES = ANNOUNCEMENT_TARGET_ROLES;

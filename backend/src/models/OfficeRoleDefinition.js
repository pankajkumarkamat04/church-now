const mongoose = require('mongoose');

/**
 * Configurable office / role templates (CYF President, Treasurer, Chairperson, etc.).
 * Separate from User.role (system auth) and User.memberCategory (coarse class).
 */
const officeRoleDefinitionSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true, trim: true, uppercase: true },
    roleLabel: { type: String, required: true, trim: true },
    /** Optional: limit this office to a specific council (null = any / congregation-level). */
    council: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalCouncil',
      default: null,
      index: true,
    },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

officeRoleDefinitionSchema.index({ roleKey: 1, council: 1 }, { unique: true });

module.exports = mongoose.model('OfficeRoleDefinition', officeRoleDefinitionSchema);
module.exports.DEFAULT_OFFICE_ROLES = [
  { roleKey: 'CYF_PRESIDENT', roleLabel: 'CYF President', sortOrder: 10 },
  { roleKey: 'CYF_VICE_PRESIDENT', roleLabel: 'CYF Vice President', sortOrder: 20 },
  { roleKey: 'CYF_SECRETARY', roleLabel: 'CYF Secretary', sortOrder: 30 },
  { roleKey: 'CYF_TREASURER', roleLabel: 'CYF Treasurer', sortOrder: 40 },
  { roleKey: 'CYF_ORGANISING_SECRETARY', roleLabel: 'CYF Organising Secretary', sortOrder: 50 },
  { roleKey: 'CHAIRPERSON', roleLabel: 'Chairperson', sortOrder: 60 },
  { roleKey: 'SECRETARY', roleLabel: 'Secretary', sortOrder: 70 },
  { roleKey: 'TREASURER', roleLabel: 'Treasurer', sortOrder: 80 },
  { roleKey: 'COMMITTEE_MEMBER', roleLabel: 'Committee Member', sortOrder: 90 },
];

const mongoose = require('mongoose');

const SCOPE_TYPES = ['COUNCIL', 'COUNCIL_REGION', 'CHURCH', 'CONFERENCE', 'NATIONAL'];
const ASSIGNMENT_STATUSES = ['ACTIVE', 'ENDED', 'PENDING'];

/**
 * Scoped office assignment: who holds which office, for which unit, for which term.
 * Multiple active assignments allowed; does not overwrite User.role / membership.
 */
const officeAssignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roleDefinition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfficeRoleDefinition',
      default: null,
    },
    roleKey: { type: String, required: true, trim: true, uppercase: true },
    roleLabel: { type: String, required: true, trim: true },
    council: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalCouncil',
      default: null,
      index: true,
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CouncilRegion',
      default: null,
      index: true,
    },
    scopeType: {
      type: String,
      enum: SCOPE_TYPES,
      required: true,
      default: 'COUNCIL',
      index: true,
    },
    scopeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
    appointedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

officeAssignmentSchema.index({ user: 1, status: 1 });
officeAssignmentSchema.index({ council: 1, region: 1, status: 1 });

/** End assignments whose endDate has passed. */
officeAssignmentSchema.statics.expireOverdue = async function expireOverdue() {
  const now = new Date();
  await this.updateMany(
    { status: 'ACTIVE', endDate: { $ne: null, $lt: now } },
    { $set: { status: 'ENDED' } }
  );
};

module.exports = mongoose.model('OfficeAssignment', officeAssignmentSchema);
module.exports.SCOPE_TYPES = SCOPE_TYPES;
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;

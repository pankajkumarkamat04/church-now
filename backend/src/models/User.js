const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['SUPERADMIN', 'CHURCH_ADMIN', 'ADMIN', 'MEMBER'];
const APPROVAL_STATUSES = ['PENDING', 'APPROVED'];
const REGISTRATION_SOURCES = ['SYSTEM', 'SELF_SIGNUP'];

const GENDERS = ['MALE', 'FEMALE'];
const MEMBER_CATEGORIES = [
  'MEMBER',
  'PRESIDENT',
  'MODERATOR',
  'PASTOR',
  'CYF_PRESIDENT',
  'CYF_TREASURER',
  'CHAIRPERSON',
];
/** Congregation badge classification (distinct from memberCategory office roles). */
const MEMBER_BADGE_TYPES = ['BADGED', 'NON_BADGED'];

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: '' },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    stateOrProvince: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

/** Per-council badging dates (optional; completed after initial registration). */
const councilBadgeSchema = new mongoose.Schema(
  {
    councilId: { type: mongoose.Schema.Types.ObjectId, required: true },
    badgedVolunteerDate: { type: Date, default: null },
    badgedRuwadzanoDate: { type: Date, default: null },
  },
  { _id: false }
);

/** Historical offices / positions held in church life. */
const positionHeldSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    organization: { type: String, trim: true, default: '' },
    fromDate: { type: Date, default: null },
    toDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    firstName: { type: String, trim: true, default: '' },
    surname: { type: String, trim: true, default: '' },
    fullName: { type: String, trim: true, default: '' },
    idNumber: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    gender: {
      type: String,
      enum: GENDERS,
    },
    dateOfBirth: { type: Date, default: null },
    /** Full membership attained (optional at signup; complete later). */
    isFullMember: { type: Boolean, default: false },
    /** Date of full membership (when received into full membership). */
    membershipDate: { type: Date, default: null },
    /** Mufundisi (minister) who admitted the member into full membership. */
    admittedBy: { type: String, trim: true, default: '' },
    /** Baptism record (optional at signup). */
    baptismDate: { type: Date, default: null },
    baptismBy: { type: String, trim: true, default: '' },
    baptismPlace: { type: String, trim: true, default: '' },
    /** Per-council Volunteer / Ruwadzano badge dates. */
    councilBadges: { type: [councilBadgeSchema], default: [] },
    /** Historical positions held (committee, office, etc.). */
    positionsHeld: { type: [positionHeldSchema], default: [] },
    address: { type: addressSchema, default: () => ({}) },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      default: null,
    },
    conferences: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conference',
      },
    ],
    councilIds: [{ type: mongoose.Schema.Types.ObjectId }],
    /** Council regions (e.g. CYF regions) — independent of church conference. */
    councilRegionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CouncilRegion' }],
    /** Diaspora membership classification (not a province). */
    isDiaspora: { type: Boolean, default: false, index: true },
    memberCategory: {
      type: String,
      enum: MEMBER_CATEGORIES,
      default: 'MEMBER',
    },
    /**
     * PASTOR only: LOCAL = spiritual pastor of home sub-church; MAIN_CHURCH = serves denomination (main church pool).
     */
    pastorServiceScope: {
      type: String,
      enum: ['MAIN_CHURCH', 'LOCAL'],
      default: null,
    },
    memberBadgeType: {
      type: String,
      enum: MEMBER_BADGE_TYPES,
      default: 'NON_BADGED',
      index: true,
    },
    memberRoleDisplay: { type: String, trim: true, default: 'MEMBER' },
    /** Globally unique member number (assigned to MEMBER; kept when promoted to ADMIN). */
    memberId: { type: String, trim: true, default: '' },
    adminChurches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Church',
      },
    ],
    /** Pastor/minister appointed by main church president as denomination Church Admin. */
    denominationAdminAppointedAt: { type: Date, default: null },
    denominationAdminAppointedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'APPROVED',
      index: true,
    },
    registrationSource: {
      type: String,
      enum: REGISTRATION_SOURCES,
      default: 'SYSTEM',
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index(
  { memberId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      memberId: { $gt: '' },
    },
  }
);

/** Drop legacy gender values (OTHER, PREFER_NOT_SAY) so saves pass the Male/Female enum. */
userSchema.pre('validate', function clearLegacyGender() {
  if (this.gender != null && this.gender !== '' && !GENDERS.includes(this.gender)) {
    this.gender = undefined;
  }
});

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
  }
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
module.exports.GENDERS = GENDERS;
module.exports.MEMBER_CATEGORIES = MEMBER_CATEGORIES;
module.exports.MEMBER_BADGE_TYPES = MEMBER_BADGE_TYPES;
module.exports.APPROVAL_STATUSES = APPROVAL_STATUSES;
module.exports.REGISTRATION_SOURCES = REGISTRATION_SOURCES;



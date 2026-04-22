const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['SUPERADMIN', 'ADMIN', 'MEMBER'];

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY'];
const MEMBER_CATEGORIES = ['MEMBER', 'PRESIDENT', 'MODERATOR', 'PASTOR'];

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

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
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
    /** When the person was received / joined the congregation (record-keeping). */
    membershipDate: { type: Date, default: null },
    /** Baptism date if applicable. */
    baptismDate: { type: Date, default: null },
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
    memberCategory: {
      type: String,
      enum: MEMBER_CATEGORIES,
      default: 'MEMBER',
    },
    memberRoleDisplay: { type: String, trim: true, default: 'MEMBER' },
    /** Congregation-unique member number (assigned to MEMBER; kept when promoted to ADMIN). */
    memberId: { type: String, trim: true, default: '' },
    adminChurches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Church',
      },
    ],
    isActive: { type: Boolean, default: true },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index(
  { church: 1, memberId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: 'MEMBER',
      memberId: { $gt: '' },
    },
  }
);

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

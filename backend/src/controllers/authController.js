const crypto = require('crypto');
const User = require('../models/User');
const Church = require('../models/Church');
const Conference = require('../models/Conference');
const { MEMBER_CATEGORIES } = require('../models/User');
const { signToken } = require('../utils/token');
const { toProfileResponse, attachCouncilNamesToProfile } = require('../utils/memberProfile');
const { resolveMemberIdForChurch } = require('../utils/memberId');
const { syncMemberActiveStatusByPayments } = require('../utils/memberPaymentActivity');

const CHURCH_FIELDS =
  'name churchType conference mainChurch address city stateOrProvince postalCode country phone email latitude longitude isActive localLeadership councils';

const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/auth/register — self-serve member signup for an existing church.
 */
async function register(req, res) {
  try {
    const {
      email,
      password,
      churchId,
      conferenceIds,
      memberCategory,
      firstName,
      surname,
      idNumber,
      dateOfBirth,
      gender,
      contactPhone,
      address,
    } = req.body;
    const incomingConferenceIds = Array.isArray(conferenceIds)
      ? conferenceIds
      : req.body.conferenceId
        ? [req.body.conferenceId]
        : [];
    if (!email || !password || !churchId || !firstName || !surname || !contactPhone) {
      return res.status(400).json({
        message: 'Email, password, church selection, first name, surname and contact phone are required',
      });
    }
    const church = await Church.findOne({ _id: churchId, isActive: true });
    const selectedConferenceIds = Array.from(
      new Set(
        (incomingConferenceIds.length > 0
          ? incomingConferenceIds
          : church.conference
            ? [String(church.conference)]
            : []
        )
          .map((id) => String(id))
          .filter(Boolean)
      )
    );
    if (selectedConferenceIds.length !== 1) {
      return res.status(400).json({ message: 'Select exactly one conference' });
    }
    if (!church) {
      return res.status(400).json({
        message: 'Selected church was not found or is inactive.',
      });
    }
    const conferences = await Conference.find({ _id: { $in: selectedConferenceIds }, isActive: true }).select('_id');
    if (conferences.length !== selectedConferenceIds.length) {
      return res.status(400).json({ message: 'One or more selected conferences are invalid' });
    }
    if (!church.conference || String(church.conference) !== selectedConferenceIds[0]) {
      return res.status(400).json({ message: 'Selected church does not belong to the selected conference' });
    }
    const normalizedCategory = String(memberCategory || 'MEMBER').toUpperCase();
    if (!MEMBER_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({ message: `memberCategory must be one of: ${MEMBER_CATEGORIES.join(', ')}` });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    let memberId;
    try {
      memberId = await resolveMemberIdForChurch(church._id, null);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid member ID' });
    }
    // Self-serve signup is always MEMBER; never accept role from the client.
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: String(firstName).trim(),
      surname: String(surname).trim(),
      fullName: `${String(firstName).trim()} ${String(surname).trim()}`.trim(),
      idNumber: String(idNumber || '').trim(),
      contactPhone: String(contactPhone).trim(),
      gender: gender || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address:
        address && typeof address === 'object'
          ? {
              line1: String(address.line1 || '').trim(),
              line2: String(address.line2 || '').trim(),
              city: String(address.city || '').trim(),
              stateOrProvince: String(address.stateOrProvince || '').trim(),
              postalCode: String(address.postalCode || '').trim(),
              country: String(address.country || '').trim(),
            }
          : {},
      role: 'MEMBER',
      church: church._id,
      conferences: [selectedConferenceIds[0]],
      memberCategory: normalizedCategory,
      memberId,
      membershipDate: new Date(),
      approvalStatus: 'PENDING',
      registrationSource: 'SELF_SIGNUP',
    });
    return res.status(201).json({
      message: 'Registration submitted. Wait for your church admin to approve your membership.',
      requiresApproval: true,
      userId: user._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('church', CHURCH_FIELDS)
      .populate('conferences', 'conferenceId name description email phone isActive')
      .populate('adminChurches', CHURCH_FIELDS);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role === 'MEMBER' && user.approvalStatus === 'PENDING') {
      return res.status(403).json({
        message: 'Your membership is pending approval by your church admin.',
      });
    }
    await syncMemberActiveStatusByPayments(user);
    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: 'Your account is inactive because no tithe or subscription payment was made in the last 3 months' });
    }
    const token = signToken({
      sub: user._id.toString(),
      role: user.role,
    });
    return res.json({
      token,
      user: await attachCouncilNamesToProfile(toProfileResponse(user)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .populate('church', CHURCH_FIELDS)
      .populate('conferences', 'conferenceId name description email phone isActive')
      .populate('adminChurches', CHURCH_FIELDS);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(await attachCouncilNamesToProfile(toProfileResponse(user)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load profile' });
  }
}

/**
 * POST /api/auth/forgot-password { email }
 */
async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalized = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalized });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashResetToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetPath = `/reset-password?email=${encodeURIComponent(normalized)}&token=${rawToken}`;
    const resetLink = `${frontendBase.replace(/\/$/, '')}${resetPath}`;

    return res.json({
      message: GENERIC_FORGOT_MESSAGE,
      ...(process.env.PASSWORD_RESET_RETURN_TOKEN === 'true'
        ? { resetToken: rawToken, resetLink }
        : {}),
    });
  }

  return res.json({ message: GENERIC_FORGOT_MESSAGE });
}

/**
 * POST /api/auth/reset-password { email, token, password }
 */
async function resetPassword(req, res) {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ message: 'Email, token, and new password are required' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordResetToken +passwordResetExpires +password'
  );

  if (
    !user ||
    !user.passwordResetToken ||
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now()
  ) {
    return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
  }

  const hashed = hashResetToken(token);
  if (hashed !== user.passwordResetToken) {
    return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.json({ message: 'Password has been reset. You can sign in with your new password.' });
}

module.exports = {
  register,
  login,
  me,
  requestPasswordReset,
  resetPassword,
};

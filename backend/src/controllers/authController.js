const User = require('../models/User');
const Church = require('../models/Church');
const Conference = require('../models/Conference');
const { signToken } = require('../utils/token');
const { toProfileResponse, attachCouncilNamesToProfile } = require('../utils/memberProfile');
const { resolveMemberIdForChurch, isMemberIdDuplicateKeyError } = require('../utils/memberId');
const { syncMemberActiveStatusByPayments } = require('../utils/memberPaymentActivity');
const { getConferenceLeadershipSummaryForMe } = require('../utils/conferenceLeaderAccess');

const CHURCH_FIELDS =
  'name churchType conference mainChurch address city stateOrProvince postalCode country phone email latitude longitude isActive localLeadership councils';

const { hashResetToken, issuePasswordResetLink, validateNewPassword } = require('../utils/passwordReset');

const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';

/**
 * POST /api/auth/register — short self-serve signup.
 * Member provides affiliation + account + contact only.
 * Church admin / superadmin complete remaining profile fields on approval.
 */
async function register(req, res) {
  try {
    const { email, password, churchId, conferenceIds, firstName, surname, contactPhone } = req.body;
    const incomingConferenceIds = Array.isArray(conferenceIds)
      ? conferenceIds
      : req.body.conferenceId
        ? [req.body.conferenceId]
        : [];
    if (!email || !password || !churchId || !firstName || !surname || !contactPhone) {
      return res.status(400).json({
        message:
          'Email, password, church selection, first name, surname, and contact phone are required',
      });
    }
    const passwordErr = validateNewPassword(password);
    if (passwordErr) {
      return res.status(400).json({ message: passwordErr });
    }
    const phone = String(contactPhone || '').trim();
    if (!/^\+?[0-9()\-\s]{7,20}$/.test(phone)) {
      return res.status(400).json({
        message: 'Enter a valid contact phone number (digits, spaces, or + country code)',
      });
    }
    const church = await Church.findOne({ _id: churchId, isActive: true });
    if (!church) {
      return res.status(400).json({
        message: 'Selected church was not found or is inactive.',
      });
    }
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
    const conferences = await Conference.find({ _id: { $in: selectedConferenceIds }, isActive: true }).select('_id');
    if (conferences.length !== selectedConferenceIds.length) {
      return res.status(400).json({ message: 'One or more selected conferences are invalid' });
    }
    if (!church.conference || String(church.conference) !== selectedConferenceIds[0]) {
      return res.status(400).json({ message: 'Selected church does not belong to the selected conference' });
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
    const normalizedFirstName = String(firstName).trim();
    const normalizedSurname = String(surname).trim();
    // Self-serve signup is always MEMBER; profile details completed by admin later.
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: normalizedFirstName,
      surname: normalizedSurname,
      fullName: `${normalizedFirstName} ${normalizedSurname}`.trim(),
      idNumber: '',
      contactPhone: phone,
      role: 'MEMBER',
      church: church._id,
      conferences: [selectedConferenceIds[0]],
      councilIds: [],
      councilRegionIds: [],
      isDiaspora: false,
      memberCategory: 'MEMBER',
      memberId,
      isFullMember: false,
      membershipDate: null,
      baptismDate: null,
      memberBadgeType: 'NON_BADGED',
      approvalStatus: 'PENDING',
      registrationSource: 'SELF_SIGNUP',
      isActive: false,
      address: {},
    });
    return res.status(201).json({
      message:
        'Registration submitted. Your church admin will complete your profile and approve your membership before you can sign in.',
      requiresApproval: true,
      userId: user._id,
    });
  } catch (err) {
    if (isMemberIdDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'Member ID already in use' });
    }
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
        message:
          'Your registration is pending. Your church admin must complete your profile and approve your membership before you can sign in.',
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
    const profile = await attachCouncilNamesToProfile(toProfileResponse(user));
    const leadership = await getConferenceLeadershipSummaryForMe(user._id);
    return res.json({
      token,
      user: { ...profile, ...leadership },
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
    const profile = await attachCouncilNamesToProfile(toProfileResponse(user));
    const leadership = await getConferenceLeadershipSummaryForMe(user._id);
    return res.json({ ...profile, ...leadership });
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
    const { resetLink } = await issuePasswordResetLink(user);
    const rawTokenMatch = resetLink.match(/[?&]token=([^&]+)/);
    const rawToken = rawTokenMatch ? rawTokenMatch[1] : undefined;

    return res.json({
      message: GENERIC_FORGOT_MESSAGE,
      ...(process.env.PASSWORD_RESET_RETURN_TOKEN === 'true' && rawToken
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
  const passwordErr = validateNewPassword(password);
  if (passwordErr) {
    return res.status(400).json({ message: passwordErr });
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

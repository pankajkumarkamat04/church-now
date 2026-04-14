const crypto = require('crypto');
const User = require('../models/User');
const Church = require('../models/Church');
const { signToken } = require('../utils/token');
const { toProfileResponse } = require('../utils/memberProfile');

const CHURCH_FIELDS = 'name slug address city country phone isActive';

const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/auth/register — self-serve member signup for an existing church (by public slug).
 */
async function register(req, res) {
  try {
    const { email, password, churchSlug, fullName } = req.body;
    if (!email || !password || !churchSlug) {
      return res
        .status(400)
        .json({ message: 'Email, password, and church URL slug are required' });
    }
    const slug = String(churchSlug).toLowerCase().trim();
    const church = await Church.findOne({ slug, isActive: true });
    if (!church) {
      return res.status(400).json({
        message:
          'Church not found or inactive. Ask your church for the site URL slug (the part after / in their public link).',
      });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    // Self-serve signup is always MEMBER; never accept role from the client.
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      fullName: String(fullName || '').trim(),
      role: 'MEMBER',
      church: church._id,
    });
    const populated = await User.findById(user._id).populate('church', CHURCH_FIELDS);
    const token = signToken({
      sub: user._id.toString(),
      role: user.role,
    });
    return res.status(201).json({
      token,
      user: toProfileResponse(populated),
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
      .populate('church', CHURCH_FIELDS);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken({
      sub: user._id.toString(),
      role: user.role,
    });
    return res.json({
      token,
      user: toProfileResponse(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user._id).populate('church', CHURCH_FIELDS);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(toProfileResponse(user));
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

    if (process.env.NODE_ENV !== 'production') {
      console.info('[password-reset]', user.email, resetLink);
    }

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

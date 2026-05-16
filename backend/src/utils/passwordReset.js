const crypto = require('crypto');

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildResetLink(email, rawToken) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetPath = `/reset-password?email=${encodeURIComponent(email)}&token=${rawToken}`;
  return `${frontendBase.replace(/\/$/, '')}${resetPath}`;
}

function validateNewPassword(password) {
  if (typeof password !== 'string' || password.trim().length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}

/**
 * @param {import('../models/User')} user — mongoose document
 */
async function issuePasswordResetLink(user) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashResetToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  return {
    resetLink: buildResetLink(user.email, rawToken),
    expiresAt: user.passwordResetExpires,
  };
}

module.exports = {
  hashResetToken,
  buildResetLink,
  validateNewPassword,
  issuePasswordResetLink,
};

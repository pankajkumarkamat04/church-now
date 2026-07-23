const crypto = require('crypto');

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildResetLink(email, rawToken) {
  const frontendBase = String(process.env.FRONTEND_URL || '')
    .trim()
    .replace(/\/$/, '');
  const resetPath = `/reset-password?email=${encodeURIComponent(email)}&token=${rawToken}`;
  // No hardcoded domain — set FRONTEND_URL on the server for absolute email links.
  return frontendBase ? `${frontendBase}${resetPath}` : resetPath;
}

const { validateNewPassword } = require('./passwordPolicy');

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

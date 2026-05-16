const User = require('../models/User');
const { validateNewPassword, issuePasswordResetLink } = require('../utils/passwordReset');

function churchId(req) {
  return req.user?.church;
}

function userInAdminChurch(adminChurchId, target) {
  const cid = String(adminChurchId || '');
  if (!cid) return false;
  if (target.role === 'MEMBER') {
    return String(target.church || '') === cid;
  }
  if (target.role === 'ADMIN') {
    if (String(target.church || '') === cid) return true;
    const churches = Array.isArray(target.adminChurches) ? target.adminChurches : [];
    return churches.some((c) => String(c) === cid);
  }
  return false;
}

async function performPasswordReset(req, res, target) {
  const { password, sendResetLink } = req.body || {};
  const hasPassword =
    password !== undefined && password !== null && String(password).trim() !== '';
  const wantsLink = sendResetLink === true || sendResetLink === 'true';

  if (!hasPassword && !wantsLink) {
    return res.status(400).json({
      message: 'Provide a new password or set sendResetLink to true to generate a reset link',
    });
  }
  if (hasPassword && wantsLink) {
    return res.status(400).json({
      message: 'Provide either a new password or sendResetLink, not both',
    });
  }

  if (!target.isActive) {
    return res.status(400).json({ message: 'Cannot reset password for an inactive account' });
  }

  if (hasPassword) {
    const err = validateNewPassword(String(password).trim());
    if (err) return res.status(400).json({ message: err });
    target.password = String(password).trim();
    target.passwordResetToken = undefined;
    target.passwordResetExpires = undefined;
    await target.save();
    return res.json({ message: 'Password has been updated.' });
  }

  const { resetLink, expiresAt } = await issuePasswordResetLink(target);
  return res.json({
    message: 'Password reset link generated. Share it with the user — it expires in 1 hour.',
    resetLink,
    expiresAt,
  });
}

async function adminResetMemberPassword(req, res) {
  try {
    const cid = churchId(req);
    if (!cid) {
      return res.status(400).json({ message: 'No church assigned' });
    }

    const target = await User.findById(req.params.memberId).select(
      '+password +passwordResetToken +passwordResetExpires'
    );
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (target.role === 'SUPERADMIN') {
      return res.status(403).json({ message: 'Cannot reset this account from the church dashboard' });
    }
    if (!userInAdminChurch(cid, target)) {
      return res.status(404).json({ message: 'User not found in your congregation' });
    }

    return performPasswordReset(req, res, target);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to reset password' });
  }
}

async function superadminResetUserPassword(req, res) {
  try {
    const target = await User.findById(req.params.id).select(
      '+password +passwordResetToken +passwordResetExpires'
    );
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    return performPasswordReset(req, res, target);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to reset password' });
  }
}

module.exports = {
  adminResetMemberPassword,
  superadminResetUserPassword,
};

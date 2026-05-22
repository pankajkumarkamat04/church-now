const Church = require('../models/Church');
const GlobalCouncil = require('../models/GlobalCouncil');
const User = require('../models/User');
const { toProfileResponse, applyMemberProfilePatch, attachCouncilNamesToProfile } = require('../utils/memberProfile');
const { validateNewPassword } = require('../utils/passwordReset');

const CHURCH_FIELDS =
  'name address city stateOrProvince postalCode country phone email latitude longitude isActive localLeadership councils';

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .populate('church', CHURCH_FIELDS)
      .populate(
        'conferences',
        'conferenceId name description email phone isActive'
      );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(await attachCouncilNamesToProfile(toProfileResponse(user)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const patch = applyMemberProfilePatch(user, req.body, { allowAdminFields: false });
    if (patch.error) {
      return res.status(400).json({ message: patch.error });
    }
    await user.save();

    const fresh = await User.findById(user._id)
      .populate('church', CHURCH_FIELDS)
      .populate(
        'conferences',
        'conferenceId name description email phone isActive'
      );
    return res.json(await attachCouncilNamesToProfile(toProfileResponse(fresh)));
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update profile' });
  }
}

async function getMyChurchInfo(req, res) {
  try {
    if (!req.user.church) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const church = await Church.findById(req.user.church).populate(
      'conference',
      'conferenceId name description email phone isActive'
    );
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    return res.json(church);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load church' });
  }
}

/**
 * Councils the member belongs to (via councilIds and/or role assignments on the church).
 */
async function getMyCouncils(req, res) {
  try {
    if (!req.user.church) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const church = await Church.findById(req.user.church).select('name').lean();
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    const councilIds = Array.isArray(req.user.councilIds)
      ? Array.from(new Set(req.user.councilIds.map((id) => String(id)).filter(Boolean)))
      : [];
    const globalCouncils = councilIds.length
      ? await GlobalCouncil.find({ _id: { $in: councilIds }, isActive: true }).select('_id name').lean()
      : [];
    const councils = globalCouncils.map((c) => ({
      _id: c._id,
      name: c.name,
      myRoleLabels: ['Member'],
    }));
    return res.json({ churchName: church.name, councils });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load councils' });
  }
}

async function changePassword(req, res) {
  try {
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const passwordErr = validateNewPassword(String(newPassword));
    if (passwordErr) {
      return res.status(400).json({ message: passwordErr });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(400).json({ message: 'Cannot change password for an inactive account' });
    }

    const currentOk = await user.comparePassword(String(currentPassword));
    if (!currentOk) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const sameAsCurrent = await user.comparePassword(String(newPassword));
    if (sameAsCurrent) {
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }

    user.password = String(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to change password' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getMyChurchInfo,
  getMyCouncils,
};

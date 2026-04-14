const Church = require('../models/Church');
const User = require('../models/User');
const { toProfileResponse, applyMemberProfilePatch } = require('../utils/memberProfile');

const CHURCH_FIELDS =
  'name slug address city stateOrProvince postalCode country phone email website contactPerson latitude longitude isActive';

async function getProfile(req, res) {
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

    const fresh = await User.findById(user._id).populate('church', CHURCH_FIELDS);
    return res.json(toProfileResponse(fresh));
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
    const church = await Church.findById(req.user.church);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    return res.json(church);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load church' });
  }
}

module.exports = { getProfile, updateProfile, getMyChurchInfo };

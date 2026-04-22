const Church = require('../models/Church');
const GlobalCouncil = require('../models/GlobalCouncil');
const User = require('../models/User');
const { toProfileResponse, applyMemberProfilePatch } = require('../utils/memberProfile');

const CHURCH_FIELDS =
  'name address city stateOrProvince postalCode country phone email contactPerson latitude longitude isActive localLeadership councils';

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .populate('church', CHURCH_FIELDS)
      .populate(
        'conferences',
        'conferenceId name description email phone contactPerson isActive'
      );
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

    const fresh = await User.findById(user._id)
      .populate('church', CHURCH_FIELDS)
      .populate(
        'conferences',
        'conferenceId name description email phone contactPerson isActive'
      );
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
    const church = await Church.findById(req.user.church).populate(
      'conference',
      'conferenceId name description email phone contactPerson isActive'
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

module.exports = {
  getProfile,
  updateProfile,
  getMyChurchInfo,
  getMyCouncils,
};

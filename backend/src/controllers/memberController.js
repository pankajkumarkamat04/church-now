const Church = require('../models/Church');
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
    const church = await Church.findById(req.user.church).select('name councils').lean();
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    const uid = String(req.user._id);
    const idSet = new Set((req.user.councilIds || []).map((id) => String(id)));
    const councils = [];
    for (const c of church.councils || []) {
      const cid = c._id != null ? String(c._id) : '';
      const myRoles = (c.roles || []).filter((r) => r.member && String(r.member) === uid);
      const listed = (idSet.size && idSet.has(cid)) || myRoles.length > 0;
      if (!listed) continue;
      const myRoleLabels = myRoles.length
        ? myRoles.map((r) => (r.roleLabel && String(r.roleLabel).trim()) || r.roleKey)
        : idSet.has(cid)
          ? ['Member']
          : [];
      councils.push({ _id: c._id, name: c.name, myRoleLabels });
    }
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

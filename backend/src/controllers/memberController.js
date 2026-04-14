const Church = require('../models/Church');
const User = require('../models/User');
const Conference = require('../models/Conference');
const { toProfileResponse, applyMemberProfilePatch } = require('../utils/memberProfile');

const CHURCH_FIELDS =
  'name address city stateOrProvince postalCode country phone email website contactPerson latitude longitude isActive';

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .populate('church', CHURCH_FIELDS)
      .populate(
        'conferences',
        'conferenceId name description email phone website contactPerson leadership isActive'
      )
      .populate('councils', 'name conference');
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
        'conferenceId name description email phone website contactPerson leadership isActive'
      )
      .populate('councils', 'name conference');
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

async function listMyConferences(req, res) {
  try {
    const user = await User.findById(req.user._id).select('conferences councils');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const conferenceIds = Array.isArray(user.conferences) ? user.conferences : [];
    if (conferenceIds.length === 0) return res.json([]);
    const rows = await Conference.find({ _id: { $in: conferenceIds }, isActive: true })
      .populate(
        'leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents',
        'fullName email'
      )
      .sort({ name: 1 });
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load conferences' });
  }
}

async function joinConference(req, res) {
  try {
    const conference = await Conference.findOne({ _id: req.params.conferenceId, isActive: true }).select(
      '_id'
    );
    if (!conference) return res.status(404).json({ message: 'Conference not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const current = Array.isArray(user.conferences) ? user.conferences.map((id) => String(id)) : [];
    if (current.includes(String(conference._id))) {
      return res.status(409).json({ message: 'You already joined this conference' });
    }
    user.conferences = [...current, String(conference._id)];
    await user.save();

    const rows = await Conference.find({ _id: { $in: user.conferences }, isActive: true })
      .populate(
        'leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents',
        'fullName email'
      )
      .sort({ name: 1 });
    return res.status(201).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to join conference' });
  }
}

async function getConferenceDetails(req, res) {
  try {
    const row = await Conference.findOne({ _id: req.params.conferenceId, isActive: true }).populate(
      'leadership.churchBishop leadership.moderator leadership.secretary leadership.treasurer leadership.president leadership.superintendents',
      'fullName email'
    );
    if (!row) return res.status(404).json({ message: 'Conference not found' });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load conference details' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getMyChurchInfo,
  listMyConferences,
  joinConference,
  getConferenceDetails,
};

const Church = require('../models/Church');
const User = require('../models/User');
const Event = require('../models/Event');
const GalleryItem = require('../models/GalleryItem');
const Conference = require('../models/Conference');

async function validateConferenceOrThrow(conferenceId) {
  if (!conferenceId) return null;
  const conference = await Conference.findById(conferenceId).select('_id');
  if (!conference) {
    const error = new Error('Conference not found');
    error.statusCode = 404;
    throw error;
  }
  return conference;
}

async function validateMainChurchOrThrow(mainChurchId) {
  if (!mainChurchId) return null;
  const mainChurch = await Church.findOne({ _id: mainChurchId, churchType: 'MAIN' }).select('_id conference');
  if (!mainChurch) {
    const error = new Error('Main church not found');
    error.statusCode = 404;
    throw error;
  }
  return mainChurch;
}

async function removeChurchWithDependencies(churchId) {
  const admins = await User.countDocuments({
    role: 'ADMIN',
    $or: [{ church: churchId }, { adminChurches: churchId }],
  });
  const members = await User.countDocuments({ church: churchId, role: 'MEMBER' });
  if (admins > 0 || members > 0) {
    const error = new Error('Reassign or remove users linked to this church before deleting');
    error.statusCode = 400;
    throw error;
  }

  await Event.deleteMany({ church: churchId });
  await GalleryItem.deleteMany({ church: churchId });
  await User.updateMany({ adminChurches: churchId }, { $pull: { adminChurches: churchId } });

  const adminsWithoutPrimary = await User.find({ role: 'ADMIN', church: churchId });
  for (const admin of adminsWithoutPrimary) {
    admin.church = admin.adminChurches?.[0] || null;
    // eslint-disable-next-line no-await-in-loop
    await admin.save();
  }
}

module.exports = {
  validateConferenceOrThrow,
  validateMainChurchOrThrow,
  removeChurchWithDependencies,
};

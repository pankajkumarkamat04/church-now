const Church = require('../models/Church');
const User = require('../models/User');
const Event = require('../models/Event');
const Conference = require('../models/Conference');
const ChurchChangeRequest = require('../models/ChurchChangeRequest');
const UserSubscription = require('../models/UserSubscription');
const TithePayment = require('../models/TithePayment');
const Donation = require('../models/Donation');
const Expense = require('../models/Expense');

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
  const members = await User.find({ church: churchId, role: 'MEMBER' }).select('_id');
  const memberIds = members.map((m) => m._id);

  const admins = await User.find({
    role: 'ADMIN',
    $or: [{ church: churchId }, { adminChurches: churchId }],
  }).select('_id church adminChurches');

  await Event.deleteMany({ church: churchId });
  await UserSubscription.deleteMany({ church: churchId });
  await TithePayment.deleteMany({ church: churchId });
  await Donation.deleteMany({ church: churchId });
  await Expense.deleteMany({ church: churchId });

  await ChurchChangeRequest.deleteMany({
    $or: [{ fromChurch: churchId }, { toChurch: churchId }],
  });

  if (memberIds.length > 0) {
    await ChurchChangeRequest.deleteMany({ user: { $in: memberIds } });
    await UserSubscription.deleteMany({ user: { $in: memberIds } });
    await TithePayment.deleteMany({ user: { $in: memberIds } });
    await Donation.deleteMany({ user: { $in: memberIds } });
    await Expense.deleteMany({ createdBy: { $in: memberIds } });
    await User.deleteMany({ _id: { $in: memberIds } });
  }

  for (const admin of admins) {
    const remainingChurches = (admin.adminChurches || [])
      .map((id) => String(id))
      .filter((id) => id !== String(churchId));

    if (remainingChurches.length === 0) {
      // Admin only belonged to this church, remove account on hard delete.
      // eslint-disable-next-line no-await-in-loop
      await User.findByIdAndDelete(admin._id);
      continue;
    }

    admin.adminChurches = remainingChurches;
    admin.church = admin.church && String(admin.church) !== String(churchId) ? admin.church : remainingChurches[0];
    // eslint-disable-next-line no-await-in-loop
    await admin.save();
  }
}

module.exports = {
  validateConferenceOrThrow,
  validateMainChurchOrThrow,
  removeChurchWithDependencies,
};

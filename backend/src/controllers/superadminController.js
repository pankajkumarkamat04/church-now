const Church = require('../models/Church');
const User = require('../models/User');
const Event = require('../models/Event');
const GalleryItem = require('../models/GalleryItem');

async function listChurches(_req, res) {
  try {
    const churches = await Church.find()
      .populate('conference', 'name conferenceId')
      .populate('mainChurch', 'name')
      .sort({ name: 1 });
    return res.json(churches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list churches' });
  }
}

async function getChurch(req, res) {
  try {
    const church = await Church.findById(req.params.id)
      .populate('conference', 'name conferenceId')
      .populate('mainChurch', 'name');
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    return res.json(church);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load church' });
  }
}

async function createChurch(req, res) {
  try {
    const {
      name,
      address,
      city,
      stateOrProvince,
      postalCode,
      country,
      phone,
      email,
      contactPerson,
      latitude,
      longitude,
      conferenceId,
      churchType,
      mainChurchId,
    } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Church name is required' });
    }
    const church = await Church.create({
      name,
      address: address || '',
      city: city || '',
      stateOrProvince: stateOrProvince || '',
      postalCode: postalCode || '',
      country: country || '',
      phone: phone || '',
      email: email || '',
      contactPerson: contactPerson || '',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      conference: conferenceId || null,
      churchType: churchType || 'MAIN',
      mainChurch: mainChurchId || null,
    });
    return res.status(201).json(church);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create church' });
  }
}

async function updateChurch(req, res) {
  try {
    const allowed = [
      'name',
      'address',
      'city',
      'stateOrProvince',
      'postalCode',
      'country',
      'phone',
      'email',
      'contactPerson',
      'latitude',
      'longitude',
      'isActive',
      'conference',
      'churchType',
      'mainChurch',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const church = await Church.findByIdAndUpdate(req.params.id, { $set: updates }, {
      new: true,
      runValidators: true,
    });
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    return res.json(church);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update church' });
  }
}

async function deleteChurch(req, res) {
  try {
    const admins = await User.countDocuments({
      role: 'ADMIN',
      $or: [{ church: req.params.id }, { adminChurches: req.params.id }],
    });
    const members = await User.countDocuments({ church: req.params.id, role: 'MEMBER' });
    if (admins > 0 || members > 0) {
      return res.status(400).json({
        message: 'Reassign or remove users linked to this church before deleting',
      });
    }
    const churchId = req.params.id;
    await Event.deleteMany({ church: churchId });
    await GalleryItem.deleteMany({ church: churchId });
    await User.updateMany({ adminChurches: churchId }, { $pull: { adminChurches: churchId } });
    const adminsWithoutPrimary = await User.find({ role: 'ADMIN', church: churchId });
    for (const admin of adminsWithoutPrimary) {
      admin.church = admin.adminChurches?.[0] || null;
      await admin.save();
    }
    const church = await Church.findByIdAndDelete(churchId);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete church' });
  }
}

function toUserListItem(u) {
  return {
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    church: u.church,
    conferences: u.conferences || [],
    memberCategory: u.memberCategory,
    adminChurches: u.adminChurches || [],
    isActive: u.isActive,
  };
}

async function listUsers(req, res) {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = String(req.query.role).toUpperCase();
    }
    if (req.query.churchId) {
      filter.church = req.query.churchId;
    }
    if (req.query.conferenceId) {
      const churchIds = await Church.find({ conference: req.query.conferenceId }).distinct('_id');
      filter.church = { $in: churchIds };
    }

    const users = await User.find(filter)
      .populate('church', 'name conference')
      .populate('adminChurches', 'name')
      .sort({ role: 1, email: 1 })
      .select('-password');
    return res.json(users.map((u) => toUserListItem(u)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list users' });
  }
}

async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .populate('church', 'name conference')
      .populate('adminChurches', 'name')
      .select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(toUserListItem(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load user' });
  }
}

async function updateUser(req, res) {
  try {
    const { fullName, isActive, churchIds, conferenceId, churchId, memberCategory } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (isActive === false && user._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    if (fullName !== undefined) {
      user.fullName = String(fullName ?? '').trim();
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }
    if (user.role === 'ADMIN' && churchIds !== undefined) {
      if (!Array.isArray(churchIds) || churchIds.length === 0) {
        return res.status(400).json({ message: 'At least one church is required for admin' });
      }
      const valid = await Church.find({ _id: { $in: churchIds } }).select('_id');
      if (valid.length !== churchIds.length) {
        return res.status(400).json({ message: 'One or more selected churches are invalid' });
      }
      user.adminChurches = churchIds;
      user.church = churchIds[0];
    }
    if (user.role === 'MEMBER') {
      if (conferenceId !== undefined || churchId !== undefined) {
        const nextConferenceId = String(conferenceId || user.conferences?.[0] || '').trim();
        const nextChurchId = String(churchId || user.church || '').trim();
        if (!nextConferenceId || !nextChurchId) {
          return res.status(400).json({ message: 'conferenceId and churchId are required for member' });
        }
        const linkedChurch = await Church.findOne({
          _id: nextChurchId,
          conference: nextConferenceId,
          isActive: true,
        }).select('_id');
        if (!linkedChurch) {
          return res.status(400).json({ message: 'Selected church must belong to selected conference' });
        }
        user.church = nextChurchId;
        user.conferences = [nextConferenceId];
      }
      if (memberCategory !== undefined) {
        user.memberCategory = String(memberCategory || '').toUpperCase();
      }
    }
    await user.save();
    const populated = await User.findById(user._id)
      .populate('church', 'name conference')
      .populate('adminChurches', 'name')
      .select('-password');
    return res.json(toUserListItem(populated));
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update user' });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'SUPERADMIN') {
      const n = await User.countDocuments({ role: 'SUPERADMIN' });
      if (n <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last superadmin' });
      }
    }
    await User.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
}

async function createChurchAdmin(req, res) {
  try {
    const { churchId } = req.params;
    const { email, password, fullName, churchIds = [] } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const selectedIds = Array.from(new Set([churchId, ...churchIds].filter(Boolean)));
    if (selectedIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one church for admin' });
    }
    const churches = await Church.find({ _id: { $in: selectedIds } }).select('_id');
    if (churches.length !== selectedIds.length) {
      return res.status(404).json({ message: 'One or more churches not found' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const admin = await User.create({
      email: email.toLowerCase(),
      password,
      fullName: fullName || '',
      role: 'ADMIN',
      church: selectedIds[0],
      adminChurches: selectedIds,
    });
    const safe = admin.toObject();
    delete safe.password;
    return res.status(201).json(safe);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create admin' });
  }
}

async function createSuperadminUser(req, res) {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      fullName: fullName || '',
      role: 'SUPERADMIN',
      church: null,
    });
    const safe = user.toObject();
    delete safe.password;
    return res.status(201).json(safe);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create superadmin' });
  }
}

async function createMemberUser(req, res) {
  try {
    const {
      email,
      password,
      firstName,
      surname,
      idNumber,
      contactPhone,
      conferenceId,
      churchId,
      memberCategory,
      gender,
      dateOfBirth,
      address,
    } = req.body;
    if (!email || !password || !conferenceId || !churchId) {
      return res.status(400).json({ message: 'email, password, conferenceId and churchId are required' });
    }
    const church = await Church.findOne({ _id: churchId, conference: conferenceId, isActive: true }).select(
      '_id conference'
    );
    if (!church) {
      return res.status(400).json({ message: 'Selected church does not belong to selected conference' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedSurname = String(surname || '').trim();
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: normalizedFirstName,
      surname: normalizedSurname,
      fullName: `${normalizedFirstName} ${normalizedSurname}`.trim(),
      idNumber: String(idNumber || '').trim(),
      contactPhone: String(contactPhone || '').trim(),
      role: 'MEMBER',
      church: church._id,
      conferences: [conferenceId],
      memberCategory: String(memberCategory || 'MEMBER').toUpperCase(),
      gender: gender || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address || {},
    });
    const safe = await User.findById(user._id).populate('church', 'name conference').select('-password');
    return res.status(201).json(toUserListItem(safe));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create member' });
  }
}

module.exports = {
  listChurches,
  getChurch,
  createChurch,
  updateChurch,
  deleteChurch,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  createChurchAdmin,
  createSuperadminUser,
  createMemberUser,
};

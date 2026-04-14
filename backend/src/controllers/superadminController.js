const Church = require('../models/Church');
const User = require('../models/User');
const Event = require('../models/Event');
const GalleryItem = require('../models/GalleryItem');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueChurchSlug(base) {
  let slug = base || 'church';
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists = await Church.findOne({ slug: candidate });
    if (!exists) return candidate;
    n += 1;
  }
}

async function listChurches(_req, res) {
  try {
    const churches = await Church.find().sort({ name: 1 });
    return res.json(churches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list churches' });
  }
}

async function getChurch(req, res) {
  try {
    const church = await Church.findById(req.params.id);
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
    const { name, address, city, country, phone, slug } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Church name is required' });
    }
    const base = slugify(slug || name);
    const finalSlug = await uniqueChurchSlug(base);
    const church = await Church.create({
      name,
      slug: finalSlug,
      address: address || '',
      city: city || '',
      country: country || '',
      phone: phone || '',
    });
    return res.status(201).json(church);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'That church slug is already in use' });
    }
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create church' });
  }
}

async function updateChurch(req, res) {
  try {
    const allowed = ['name', 'address', 'city', 'country', 'phone', 'isActive', 'slug'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.slug) {
      updates.slug = slugify(updates.slug);
      const taken = await Church.findOne({ slug: updates.slug, _id: { $ne: req.params.id } });
      if (taken) {
        return res.status(409).json({ message: 'That slug is already in use' });
      }
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
    if (err.code === 11000) {
      return res.status(409).json({ message: 'That slug is already in use' });
    }
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update church' });
  }
}

async function deleteChurch(req, res) {
  try {
    const admins = await User.countDocuments({ church: req.params.id, role: 'ADMIN' });
    const members = await User.countDocuments({ church: req.params.id, role: 'MEMBER' });
    if (admins > 0 || members > 0) {
      return res.status(400).json({
        message: 'Reassign or remove users linked to this church before deleting',
      });
    }
    const churchId = req.params.id;
    await Event.deleteMany({ church: churchId });
    await GalleryItem.deleteMany({ church: churchId });
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
    isActive: u.isActive,
  };
}

async function listUsers(req, res) {
  try {
    const users = await User.find()
      .populate('church', 'name slug')
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
      .populate('church', 'name slug')
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
    const { fullName, isActive } = req.body;
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
    await user.save();
    const populated = await User.findById(user._id)
      .populate('church', 'name slug')
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
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
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
      church: church._id,
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
};

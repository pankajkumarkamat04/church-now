const Church = require('../models/Church');
const User = require('../models/User');
const { MEMBER_CATEGORIES } = User;
const GlobalCouncil = require('../models/GlobalCouncil');
const Event = require('../models/Event');
const { populateLeadershipPaths } = require('../utils/churchLeadershipValidation');
const { resolveMemberIdForChurch } = require('../utils/memberId');
const { collectCongregationRoleLabelsForUser } = require('../utils/churchMemberRoles');
const { syncChurchMemberRoleDisplays } = require('../utils/memberRoleSync');
const { enrichChurchRowsForLocalMinisterList } = require('../utils/churchListLocalMinister');

async function normalizeAndValidateGlobalCouncilIds(inputCouncilIds) {
  const normalized = Array.isArray(inputCouncilIds)
    ? Array.from(new Set(inputCouncilIds.map((id) => String(id)).filter(Boolean)))
    : [];
  if (normalized.length === 0) {
    return { error: 'Select at least one council' };
  }
  const validRows = await GlobalCouncil.find({ _id: { $in: normalized }, isActive: true }).select('_id').lean();
  if (validRows.length !== normalized.length) {
    return { error: 'One or more selected councils are invalid or inactive' };
  }
  return { ids: normalized };
}

async function listChurches(_req, res) {
  try {
    const churches = await Church.find()
      .populate('conference', 'name conferenceId')
      .populate('mainChurch', 'name')
      .populate(populateLeadershipPaths)
      .sort({ name: 1 })
      .lean();
    const enriched = await enrichChurchRowsForLocalMinisterList(churches);
    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list churches' });
  }
}

async function getChurch(req, res) {
  try {
    const church = await Church.findById(req.params.id)
      .populate('conference', 'name conferenceId')
      .populate('mainChurch', 'name')
      .populate(populateLeadershipPaths);
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
      returnDocument: 'after',
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

async function listCouncils(_req, res) {
  try {
    const rows = await GlobalCouncil.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list councils' });
  }
}

async function listCouncilMembers(req, res) {
  try {
    const councilId = String(req.params.councilId || '').trim();
    const council = await GlobalCouncil.findOne({ _id: councilId, isActive: true }).select('_id name').lean();
    if (!council) {
      return res.status(404).json({ message: 'Council not found' });
    }
    const members = await User.find({
      role: { $in: ['MEMBER', 'ADMIN'] },
      councilIds: councilId,
    })
      .sort({ fullName: 1, email: 1 })
      .select('-password')
      .populate('church', 'name')
      .lean();
    return res.json({
      council,
      members: members.map((u) => ({
        id: u._id,
        email: u.email,
        fullName: u.fullName,
        memberId: u.memberId || '',
        role: u.role,
        church: u.church,
        isActive: u.isActive,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load council members' });
  }
}

async function createCouncil(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Council name is required' });
    const row = await GlobalCouncil.create({ name });
    return res.status(201).json(row);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Council name already exists' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create council' });
  }
}

async function updateCouncil(req, res) {
  try {
    const updates = {};
    if (req.body?.name !== undefined) {
      updates.name = String(req.body.name || '').trim();
      if (!updates.name) {
        return res.status(400).json({ message: 'Council name is required' });
      }
    }
    if (req.body?.isActive !== undefined) {
      updates.isActive = Boolean(req.body.isActive);
    }
    const row = await GlobalCouncil.findByIdAndUpdate(req.params.councilId, { $set: updates }, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!row) return res.status(404).json({ message: 'Council not found' });
    return res.json(row);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Council name already exists' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to update council' });
  }
}

async function deleteCouncil(req, res) {
  try {
    const removed = await GlobalCouncil.findByIdAndDelete(req.params.councilId);
    if (!removed) return res.status(404).json({ message: 'Council not found' });
    await User.updateMany({}, { $pull: { councilIds: String(req.params.councilId) } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete council' });
  }
}

function toUserListItem(u, churchLeanForRoles = null) {
  const uid = u._id;
  const fromChurch =
    churchLeanForRoles && uid ? collectCongregationRoleLabelsForUser(churchLeanForRoles, uid) : [];
  const memberRoleDisplay =
    String(u.memberRoleDisplay || '').trim() || (fromChurch.length > 0 ? fromChurch.join(', ') : (u.memberCategory || 'MEMBER'));
  return {
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    church: u.church,
    conferences: u.conferences || [],
    councilIds: Array.isArray(u.councilIds) ? u.councilIds.map((id) => String(id)) : [],
    memberCategory: u.memberCategory,
    memberRoleDisplay,
    memberRolesFromChurch: fromChurch,
    memberId: u.memberId || '',
    adminChurches: u.adminChurches || [],
    isActive: u.isActive,
  };
}

async function churchLeanForUserRoles(churchId) {
  if (!churchId) return null;
  return Church.findById(churchId).select('localLeadership councils').lean();
}

/**
 * @param {string} roleQ uppercased role query: ALL | MEMBER | ADMIN | SUPERADMIN | …
 * @param {import('mongoose').Types.ObjectId} churchId
 */
function buildChurchUserScopeFilter(roleQ, churchId) {
  if (roleQ === 'ALL') {
    return {
      $or: [
        { church: churchId, role: { $in: ['MEMBER', 'ADMIN'] } },
        { adminChurches: churchId, role: 'ADMIN' },
      ],
    };
  }
  if (roleQ === 'MEMBER') {
    return { church: churchId, role: 'MEMBER' };
  }
  if (roleQ === 'ADMIN') {
    return {
      $or: [
        { church: churchId, role: 'ADMIN' },
        { adminChurches: churchId, role: 'ADMIN' },
      ],
    };
  }
  return { church: churchId, role: roleQ };
}

/**
 * @param {string} roleQ
 * @param {import('mongoose').Types.ObjectId[]} churchIds
 */
function buildConferenceUserScopeFilter(roleQ, churchIds) {
  if (!churchIds || churchIds.length === 0) {
    return { _id: { $in: [] } };
  }
  if (roleQ === 'ALL') {
    return {
      $or: [
        { church: { $in: churchIds }, role: { $in: ['MEMBER', 'ADMIN'] } },
        { adminChurches: { $in: churchIds }, role: 'ADMIN' },
      ],
    };
  }
  if (roleQ === 'MEMBER') {
    return { church: { $in: churchIds }, role: 'MEMBER' };
  }
  if (roleQ === 'ADMIN') {
    return {
      $or: [
        { church: { $in: churchIds }, role: 'ADMIN' },
        { adminChurches: { $in: churchIds }, role: 'ADMIN' },
      ],
    };
  }
  return { church: { $in: churchIds }, role: roleQ };
}

async function listUsers(req, res) {
  try {
    const filter = {};
    const roleRaw = req.query.role != null && String(req.query.role).trim() !== '' ? String(req.query.role) : null;
    const roleQ = roleRaw ? String(roleRaw).toUpperCase() : null;
    const churchId = req.query.churchId;
    const conferenceId = req.query.conferenceId;

    if (conferenceId && churchId) {
      const inConf = await Church.findOne({ _id: churchId, conference: conferenceId }).select('_id').lean();
      if (!inConf) {
        return res.json([]);
      }
      if (roleQ) {
        Object.assign(filter, buildChurchUserScopeFilter(roleQ, churchId));
      } else {
        Object.assign(filter, {
          $or: [
            { church: churchId },
            { adminChurches: churchId },
          ],
        });
      }
    } else if (churchId) {
      if (roleQ) {
        Object.assign(filter, buildChurchUserScopeFilter(roleQ, churchId));
      } else {
        Object.assign(filter, {
          $or: [
            { church: churchId },
            { adminChurches: churchId },
          ],
        });
      }
    } else if (conferenceId) {
      const churchIds = await Church.find({ conference: conferenceId }).distinct('_id');
      if (roleQ) {
        Object.assign(filter, buildConferenceUserScopeFilter(roleQ, churchIds));
      } else {
        Object.assign(filter, {
          $or: [{ church: { $in: churchIds } }, { adminChurches: { $in: churchIds } }],
        });
      }
    } else if (roleQ) {
      if (roleQ === 'ALL') {
        filter.role = { $in: ['MEMBER', 'ADMIN'] };
      } else {
        filter.role = roleQ;
      }
    }

    const users = await User.find(filter)
      .populate('church', 'name conference')
      .populate('adminChurches', 'name')
      .sort({ role: 1, email: 1 })
      .select('-password');

    const churchIds = [
      ...new Set(
        users
          .map((u) => (u.church && u.church._id ? u.church._id : u.church))
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];
    const churchDocs = await Church.find({ _id: { $in: churchIds } })
      .select('localLeadership councils')
      .lean();
    const churchById = Object.fromEntries(churchDocs.map((c) => [String(c._id), c]));

    return res.json(
      users.map((u) => {
        const cid = u.church && u.church._id ? u.church._id : u.church;
        const lean = cid ? churchById[String(cid)] : null;
        return toUserListItem(u, lean);
      })
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list users' });
  }
}

async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'church',
        select: 'name conference councils',
        populate: { path: 'conference', select: 'conferenceId name description email phone contactPerson isActive' },
      })
      .populate('adminChurches', 'name')
      .select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const cid = user.church && user.church._id ? user.church._id : user.church;
    const lean = await churchLeanForUserRoles(cid);
    return res.json(toUserListItem(user, lean));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load user' });
  }
}

async function updateUser(req, res) {
  try {
    const {
      fullName,
      isActive,
      churchIds,
      conferenceId,
      churchId,
      memberCategory,
      councilIds,
      removeAdmin,
    } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const previousChurchId = user.church ? String(user.church) : null;

    if (isActive === false && user._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    if (fullName !== undefined) {
      user.fullName = String(fullName ?? '').trim();
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    if (removeAdmin === true) {
      if (user.role !== 'ADMIN' || !String(user.memberId || '').trim()) {
        return res.status(400).json({
          message: 'removeAdmin is only for church admins who were promoted from a member (have a member ID)',
        });
      }
      user.role = 'MEMBER';
      user.adminChurches = [];
    }

    const promotedMemberAdmin = user.role === 'ADMIN' && String(user.memberId || '').trim();
    if (user.role === 'ADMIN' && churchIds !== undefined && !promotedMemberAdmin) {
      if (!Array.isArray(churchIds) || churchIds.length === 0) {
        return res.status(400).json({ message: 'At least one church is required for admin' });
      }
      const valid = await Church.find({ _id: { $in: churchIds }, isActive: true }).select('_id');
      if (valid.length !== churchIds.length) {
        return res.status(400).json({ message: 'One or more selected churches are invalid or inactive' });
      }
      user.adminChurches = churchIds;
      user.church = churchIds[0];
    }

    const editMemberFields = user.role === 'MEMBER' || promotedMemberAdmin;
    if (editMemberFields) {
      if (conferenceId !== undefined || churchId !== undefined) {
        const nextConferenceId = String(conferenceId || user.conferences?.[0] || '').trim();
        const nextChurchId = String(churchId || user.church || '').trim();
        if (!nextConferenceId || !nextChurchId) {
          return res.status(400).json({ message: 'conferenceId and churchId are required' });
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
        if (promotedMemberAdmin) {
          user.adminChurches = [nextChurchId];
        }
      }
      if (memberCategory !== undefined) {
        const v = String(memberCategory || '').toUpperCase();
        if (!MEMBER_CATEGORIES.includes(v)) {
          return res.status(400).json({ message: `memberCategory must be one of: ${MEMBER_CATEGORIES.join(', ')}` });
        }
        user.memberCategory = v;
      }
      if (councilIds !== undefined) {
        const councilResult = await normalizeAndValidateGlobalCouncilIds(councilIds);
        if (councilResult.error) {
          return res.status(400).json({ message: councilResult.error });
        }
        user.councilIds = councilResult.ids;
      }
    }

    if (promotedMemberAdmin && user.church) {
      user.adminChurches = [user.church];
    }

    await user.save();

    const syncIds = new Set();
    if (previousChurchId) syncIds.add(previousChurchId);
    if (user.church) syncIds.add(String(user.church));
    await Promise.all(
      [...syncIds].map((cid) =>
        Church.findById(cid)
          .select('localLeadership councils')
          .then((ch) => (ch ? syncChurchMemberRoleDisplays(ch.toObject ? ch.toObject() : ch) : null))
      )
    );

    const populated = await User.findById(user._id)
      .populate({
        path: 'church',
        select: 'name conference councils',
        populate: { path: 'conference', select: 'conferenceId name' },
      })
      .populate('adminChurches', 'name')
      .select('-password');
    const pcid = populated.church && populated.church._id ? populated.church._id : populated.church;
    const lean = await churchLeanForUserRoles(pcid);
    return res.json(toUserListItem(populated, lean));
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
    const routeChurchId = req.params.churchId;
    const { memberUserId, password } = req.body;

    if (!memberUserId) {
      return res.status(400).json({ message: 'memberUserId is required — select a member of this church' });
    }

    const member = await User.findById(memberUserId).select('+password');
    if (!member || member.role !== 'MEMBER') {
      return res.status(400).json({ message: 'Selected user is not a member of a congregation' });
    }

    const memberChurchId = member.church ? String(member.church) : '';
    if (!memberChurchId || memberChurchId !== String(routeChurchId)) {
      return res.status(400).json({
        message:
          'Only a member of this church may become its admin. Select someone who belongs to this congregation.',
      });
    }

    const activeChurch = await Church.findOne({ _id: routeChurchId, isActive: true }).select('_id');
    if (!activeChurch) {
      return res.status(404).json({ message: 'Church not found or inactive' });
    }

    if (!member.memberId || !String(member.memberId).trim()) {
      member.memberId = await resolveMemberIdForChurch(memberChurchId, null);
    }

    const selectedIds = [memberChurchId];

    if (password !== undefined && password !== null && String(password).trim() !== '') {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      member.password = password;
    }

    member.role = 'ADMIN';
    member.adminChurches = selectedIds;
    member.church = selectedIds[0];
    await member.save();

    const populated = await User.findById(member._id)
      .populate('church', 'name conference')
      .populate('adminChurches', 'name')
      .select('-password');
    const lean = await churchLeanForUserRoles(routeChurchId);
    return res.status(201).json(toUserListItem(populated, lean));
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
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
      councilIds,
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
    const councilResult = await normalizeAndValidateGlobalCouncilIds(councilIds);
    if (councilResult.error) {
      return res.status(400).json({ message: councilResult.error });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    let assignedMemberId;
    try {
      assignedMemberId = await resolveMemberIdForChurch(church._id, null);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid member ID' });
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
      councilIds: councilResult.ids,
      memberCategory: String(memberCategory || 'MEMBER').toUpperCase(),
      memberId: assignedMemberId,
      gender: gender || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address || {},
      membershipDate: new Date(),
    });
    const safe = await User.findById(user._id).populate('church', 'name conference').select('-password');
    const lean = await churchLeanForUserRoles(church._id);
    return res.status(201).json(toUserListItem(safe, lean));
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
  listCouncils,
  listCouncilMembers,
  createCouncil,
  updateCouncil,
  deleteCouncil,
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

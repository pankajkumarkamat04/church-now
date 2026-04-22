const User = require('../models/User');
const Church = require('../models/Church');
const GlobalCouncil = require('../models/GlobalCouncil');
const Conference = require('../models/Conference');
const PastorTerm = require('../models/PastorTerm');
const { MEMBER_CATEGORIES } = require('../models/User');
const {
  toProfileResponse,
  applyMemberProfilePatch,
  attachCouncilNamesToProfile,
  attachCouncilNamesToProfiles,
} = require('../utils/memberProfile');
const { resolveMemberIdForChurch } = require('../utils/memberId');
const { validateChurchLeadershipPayload } = require('../utils/churchLeadershipValidation');
const { syncChurchMemberRoleDisplays } = require('../utils/memberRoleSync');

const CHURCH_POPULATE =
  'name churchType conference mainChurch address city stateOrProvince postalCode country phone email contactPerson latitude longitude isActive localLeadership councils';
const ACTIVE_PASTOR_TERM_STATUSES = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'];

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

function mergeSpiritualLeaderLabel(profile, hasActivePastorTerm) {
  if (!hasActivePastorTerm) return profile;
  const spiritualLabel = 'Spiritual leader/Pastor';
  const existing = Array.isArray(profile.memberRolesFromChurch) ? profile.memberRolesFromChurch : [];
  const alreadyHasSpiritual = existing.some((r) => String(r || '').toLowerCase().includes('spiritual'));
  const mergedRoles = alreadyHasSpiritual ? existing : [spiritualLabel, ...existing];
  return {
    ...profile,
    memberRolesFromChurch: mergedRoles,
    memberRoleDisplay: mergedRoles.length > 0 ? mergedRoles.join(', ') : spiritualLabel,
  };
}

function churchId(req) {
  return req.user?.church;
}

async function getMyChurch(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const church = await Church.findById(id);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    return res.json(church);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load church' });
  }
}

async function updateMyChurch(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
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
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const church = await Church.findById(id);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    Object.assign(church, updates);
    if (req.body.councils !== undefined) {
      try {
        const { councils } = await validateChurchLeadershipPayload(
          church._id,
          church.localLeadership?.toObject?.() || church.localLeadership || {},
          req.body.councils
        );
        church.councils = councils;
      } catch (e) {
        return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid councils payload' });
      }
    }
    await church.save();
    await syncChurchMemberRoleDisplays(church.toObject ? church.toObject() : church);
    return res.json(church);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update church' });
  }
}

async function listMembers(req, res) {
  try {
    const currentChurchId = churchId(req);
    const members = await User.find({
      $or: [
        { church: currentChurchId, role: 'MEMBER' },
        { role: 'ADMIN', $or: [{ church: currentChurchId }, { adminChurches: currentChurchId }] },
      ],
    })
      .sort({ role: 1, email: 1 })
      .select('-password')
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson isActive');
    const activePastorTerms = await PastorTerm.find({
      church: currentChurchId,
      status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
    })
      .select('pastor')
      .lean();
    const pastorIds = new Set(activePastorTerms.map((t) => String(t.pastor)));
    const base = members.map((m) => toProfileResponse(m));
    const withCouncils = await attachCouncilNamesToProfiles(base);
    return res.json(
      withCouncils.map((p, i) => mergeSpiritualLeaderLabel(p, pastorIds.has(String(members[i]._id))))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list members' });
  }
}

async function listGlobalCouncils(_req, res) {
  try {
    const rows = await GlobalCouncil.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load councils' });
  }
}

async function listAdminCouncilMembers(req, res) {
  try {
    const currentChurchId = churchId(req);
    const councilId = String(req.params.councilId || '').trim();
    if (!currentChurchId) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const council = await GlobalCouncil.findOne({ _id: councilId, isActive: true }).select('_id name').lean();
    if (!council) {
      return res.status(404).json({ message: 'Council not found' });
    }
    const members = await User.find({
      church: currentChurchId,
      role: { $in: ['MEMBER', 'ADMIN'] },
      councilIds: councilId,
    })
      .sort({ fullName: 1, email: 1 })
      .select('-password')
      .populate('church', 'name');
    return res.json({
      council,
      members: await attachCouncilNamesToProfiles(members.map((m) => toProfileResponse(m))),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load council members' });
  }
}

async function createMember(req, res) {
  try {
    const {
      email,
      password,
      firstName,
      surname,
      idNumber,
      contactPhone,
      conferenceIds,
      memberCategory,
      councilIds,
      gender,
      dateOfBirth,
      address,
      membershipDate,
      membership_date,
      baptismDate,
      baptism_date,
    } = req.body;
    const incomingConferenceIds = Array.isArray(conferenceIds)
      ? conferenceIds
      : req.body.conferenceId
        ? [req.body.conferenceId]
        : [];
    if (!email || !password || !firstName || !surname || !idNumber || !contactPhone || incomingConferenceIds.length === 0) {
      return res.status(400).json({
        message:
          'Email, password, firstName, surname, idNumber, contactPhone, and conference are required',
      });
    }
    if (!churchId(req)) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const member = new User({
      email: email.toLowerCase(),
      password,
      firstName: String(firstName).trim(),
      surname: String(surname).trim(),
      fullName: `${String(firstName).trim()} ${String(surname).trim()}`.trim(),
      idNumber: String(idNumber).trim(),
      contactPhone: String(contactPhone).trim(),
      role: 'MEMBER',
      church: churchId(req),
    });
    const selectedConferenceIds = Array.from(new Set(incomingConferenceIds.map((id) => String(id)).filter(Boolean)));
    if (selectedConferenceIds.length !== 1) {
      return res.status(400).json({ message: 'Select exactly one conference' });
    }
    const conferences = await Conference.find({ _id: { $in: selectedConferenceIds }, isActive: true }).select('_id');
    if (conferences.length !== selectedConferenceIds.length) {
      return res.status(400).json({ message: 'One or more selected conferences are invalid' });
    }
    const adminChurch = await Church.findById(churchId(req)).select('conference');
    if (!adminChurch || !adminChurch.conference || String(adminChurch.conference) !== selectedConferenceIds[0]) {
      return res.status(400).json({ message: 'Selected conference does not match this church conference' });
    }
    const normalizedCategory = String(memberCategory || 'MEMBER').toUpperCase();
    if (!MEMBER_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({ message: `memberCategory must be one of: ${MEMBER_CATEGORIES.join(', ')}` });
    }
    const councilResult = await normalizeAndValidateGlobalCouncilIds(councilIds);
    if (councilResult.error) {
      return res.status(400).json({ message: councilResult.error });
    }
    const patchResult = applyMemberProfilePatch(member, {
      conferenceIds: [selectedConferenceIds[0]],
      councilIds: councilResult.ids,
      memberCategory: normalizedCategory,
      gender,
      dateOfBirth,
      address,
      membershipDate: membershipDate !== undefined ? membershipDate : membership_date,
      baptismDate: baptismDate !== undefined ? baptismDate : baptism_date,
    });
    if (patchResult.error) {
      return res.status(400).json({ message: patchResult.error });
    }
    if (member.membershipDate == null) {
      member.membershipDate = new Date();
    }
    try {
      member.memberId = await resolveMemberIdForChurch(churchId(req), null);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message || 'Invalid member ID' });
    }
    await member.save();
    const populated = await User.findById(member._id)
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson isActive');
    return res.status(201).json(await attachCouncilNamesToProfile(toProfileResponse(populated)));
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

async function getMember(req, res) {
  try {
    const currentChurchId = churchId(req);
    const member = await User.findOne({
      _id: req.params.memberId,
      church: currentChurchId,
      role: 'MEMBER',
    })
      .select('-password')
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson isActive');
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    const activePastorTerm = await PastorTerm.findOne({
      church: currentChurchId,
      pastor: member._id,
      status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
    })
      .select('_id')
      .lean();
    return res.json(
      mergeSpiritualLeaderLabel(
        await attachCouncilNamesToProfile(toProfileResponse(member)),
        Boolean(activePastorTerm)
      )
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load member' });
  }
}

async function updateMember(req, res) {
  try {
    const member = await User.findOne({
      _id: req.params.memberId,
      church: churchId(req),
      role: 'MEMBER',
    });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    const patchResult = applyMemberProfilePatch(member, req.body, { allowAdminFields: true });
    if (patchResult.error) {
      return res.status(400).json({ message: patchResult.error });
    }
    if (req.body.councilIds !== undefined) {
      const councilResult = await normalizeAndValidateGlobalCouncilIds(req.body.councilIds);
      if (councilResult.error) {
        return res.status(400).json({ message: councilResult.error });
      }
      member.councilIds = councilResult.ids;
    }
    await member.save();
    const populated = await User.findById(member._id)
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson isActive');
    const activePastorTerm = await PastorTerm.findOne({
      church: churchId(req),
      pastor: member._id,
      status: { $in: ACTIVE_PASTOR_TERM_STATUSES },
    })
      .select('_id')
      .lean();
    return res.json(
      mergeSpiritualLeaderLabel(
        await attachCouncilNamesToProfile(toProfileResponse(populated)),
        Boolean(activePastorTerm)
      )
    );
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update member' });
  }
}

async function deactivateMember(req, res) {
  try {
    const member = await User.findOne({
      _id: req.params.memberId,
      church: churchId(req),
      role: 'MEMBER',
    });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    member.isActive = false;
    await member.save();
    return res.json({ id: member._id, isActive: member.isActive });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update member' });
  }
}

async function listPublicChurches(_req, res) {
  try {
    const churches = await Church.find({ isActive: true })
      .sort({ name: 1 })
      .select('name churchType conference city country');
    return res.json(churches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load churches' });
  }
}

module.exports = {
  getMyChurch,
  updateMyChurch,
  listMembers,
  listGlobalCouncils,
  listAdminCouncilMembers,
  createMember,
  getMember,
  updateMember,
  deactivateMember,
  listPublicChurches,
};

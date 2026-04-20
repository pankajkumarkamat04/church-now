const User = require('../models/User');
const Church = require('../models/Church');
const GlobalSiteContent = require('../models/GlobalSiteContent');
const Conference = require('../models/Conference');
const { MEMBER_CATEGORIES } = require('../models/User');
const { toProfileResponse, applyMemberProfilePatch } = require('../utils/memberProfile');

const CHURCH_POPULATE =
  'name churchType conference mainChurch address city stateOrProvince postalCode country phone email contactPerson latitude longitude isActive';

function churchId(req) {
  return req.user?.church;
}

async function getOrCreateGlobalSiteContent() {
  let doc = await GlobalSiteContent.findOne({ key: 'default' });
  if (doc) return doc;

  doc = await GlobalSiteContent.create({
    key: 'default',
    heroTitle: 'Welcome',
    heroSubtitle: '',
    heroImageUrl: '',
    miniAboutTitle: 'About us',
    miniAboutText: '',
    miniAboutImageUrl: '',
    aboutBox1Title: 'Plain and clear',
    aboutBox1Text: 'Interfaces that stay out of the way.',
    aboutBox2Title: 'Roles that fit',
    aboutBox2Text: 'Superadmin, church admin, and member views.',
    aboutBox3Title: 'Life together',
    aboutBox3Text: 'Events and photos tell your story.',
    aboutPageTitle: 'About us',
    aboutPageBody: '## Our story\n\nTell your congregation’s story here.',
    contactHeading: 'Contact',
    contactIntro: 'We would love to hear from you.',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
  });
  return doc;
}

const SITE_CONTENT_FIELDS = [
  'heroTitle',
  'heroSubtitle',
  'heroImageUrl',
  'miniAboutTitle',
  'miniAboutText',
  'miniAboutImageUrl',
  'aboutBox1Title',
  'aboutBox1Text',
  'aboutBox2Title',
  'aboutBox2Text',
  'aboutBox3Title',
  'aboutBox3Text',
  'aboutPageTitle',
  'aboutPageBody',
  'contactHeading',
  'contactIntro',
  'contactEmail',
  'contactPhone',
  'contactAddress',
];

const CHURCH_PATCH_KEYS = [
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

function applySiteFields(site, body) {
  for (const key of SITE_CONTENT_FIELDS) {
    if (body[key] !== undefined) site[key] = body[key];
  }
}

async function applyChurchPatchFromBody(church, body, churchId) {
  const churchUpdates = {};
  for (const key of CHURCH_PATCH_KEYS) {
    if (body.church && body.church[key] !== undefined) {
      churchUpdates[key] = body.church[key];
    }
  }
  if (Object.keys(churchUpdates).length) {
    Object.assign(church, churchUpdates);
    await church.save();
  }
  return {};
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
    const church = await Church.findByIdAndUpdate(id, { $set: updates }, {
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

async function listMembers(req, res) {
  try {
    const members = await User.find({
      church: churchId(req),
      role: 'MEMBER',
    })
      .sort({ email: 1 })
      .select('-password')
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson leadership isActive');
    return res.json(members.map((m) => toProfileResponse(m)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list members' });
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
      gender,
      dateOfBirth,
      address,
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
    const patchResult = applyMemberProfilePatch(member, {
      conferenceIds: [selectedConferenceIds[0]],
      memberCategory: normalizedCategory,
      gender,
      dateOfBirth,
      address,
    });
    if (patchResult.error) {
      return res.status(400).json({ message: patchResult.error });
    }
    await member.save();
    const populated = await User.findById(member._id)
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson leadership isActive');
    return res.status(201).json(toProfileResponse(populated));
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
    const member = await User.findOne({
      _id: req.params.memberId,
      church: churchId(req),
      role: 'MEMBER',
    })
      .select('-password')
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson leadership isActive');
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    return res.json(toProfileResponse(member));
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
    await member.save();
    const populated = await User.findById(member._id)
      .populate('church', CHURCH_POPULATE)
      .populate('conferences', 'conferenceId name description email phone contactPerson leadership isActive');
    return res.json(toProfileResponse(populated));
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

async function getAdminSite(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const church = await Church.findById(id);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    const site = await getOrCreateGlobalSiteContent();
    return res.json({ church, site });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load site settings' });
  }
}

async function putAdminSite(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const church = await Church.findById(id);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }

    const patch = await applyChurchPatchFromBody(church, req.body, id);
    if (patch.error) {
      return res.status(patch.status || 400).json({ message: patch.error });
    }

    const freshChurch = await Church.findById(id);
    const site = await getOrCreateGlobalSiteContent();
    return res.json({ church: freshChurch, site });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to save site settings' });
  }
}

/** Superadmin: platform-wide public site copy (one for all churches) */
async function getGlobalSite(req, res) {
  try {
    const site = await getOrCreateGlobalSiteContent();
    return res.json({ site });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load site settings' });
  }
}

async function putGlobalSite(req, res) {
  try {
    const site = await getOrCreateGlobalSiteContent();
    applySiteFields(site, req.body);
    await site.save();
    const fresh = await GlobalSiteContent.findOne({ key: 'default' });
    return res.json({ site: fresh });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to save site settings' });
  }
}

/** Marketing homepage at `/` — same global copy as church sites, without a congregation context */
async function getPublicGlobalSite(_req, res) {
  try {
    const site = await getOrCreateGlobalSiteContent();
    return res.json({ site: site.toObject() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load site' });
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
  createMember,
  getMember,
  updateMember,
  deactivateMember,
  getAdminSite,
  putAdminSite,
  getPublicGlobalSite,
  listPublicChurches,
  getGlobalSite,
  putGlobalSite,
};

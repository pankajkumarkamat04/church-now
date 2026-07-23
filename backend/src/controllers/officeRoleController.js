const OfficeRoleDefinition = require('../models/OfficeRoleDefinition');
const { DEFAULT_OFFICE_ROLES } = OfficeRoleDefinition;
const OfficeAssignment = require('../models/OfficeAssignment');
const GlobalCouncil = require('../models/GlobalCouncil');
const CouncilRegion = require('../models/CouncilRegion');
const User = require('../models/User');

async function ensureDefaultOfficeRoles() {
  const count = await OfficeRoleDefinition.countDocuments();
  if (count > 0) return;
  await OfficeRoleDefinition.insertMany(
    DEFAULT_OFFICE_ROLES.map((r) => ({ ...r, council: null, isActive: true }))
  );
}

async function listOfficeRoles(req, res) {
  try {
    await ensureDefaultOfficeRoles();
    await OfficeAssignment.expireOverdue();
    const includeInactive =
      String(req.query.includeInactive || '') === '1' || String(req.query.all || '') === '1';
    const councilId = String(req.query.councilId || '').trim();
    const filter = {};
    if (!includeInactive) filter.isActive = true;
    if (councilId) {
      filter.$or = [{ council: councilId }, { council: null }];
    }
    const rows = await OfficeRoleDefinition.find(filter)
      .populate('council', 'name abbreviation')
      .sort({ sortOrder: 1, roleLabel: 1 })
      .lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list office roles' });
  }
}

async function createOfficeRole(req, res) {
  try {
    const roleKey = String(req.body?.roleKey || '').trim().toUpperCase().replace(/\s+/g, '_');
    const roleLabel = String(req.body?.roleLabel || '').trim();
    if (!roleKey || !roleLabel) {
      return res.status(400).json({ message: 'roleKey and roleLabel are required' });
    }
    let council = null;
    if (req.body?.councilId) {
      const c = await GlobalCouncil.findById(req.body.councilId).select('_id');
      if (!c) return res.status(400).json({ message: 'Council not found' });
      council = c._id;
    }
    const row = await OfficeRoleDefinition.create({
      roleKey,
      roleLabel,
      council,
      description: String(req.body?.description || '').trim(),
      isActive: req.body?.isActive === undefined ? true : Boolean(req.body.isActive),
      sortOrder: Number(req.body?.sortOrder) || 0,
    });
    return res.status(201).json(row);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Office role already exists for this council scope' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create office role' });
  }
}

async function updateOfficeRole(req, res) {
  try {
    const updates = {};
    if (req.body?.roleLabel !== undefined) {
      updates.roleLabel = String(req.body.roleLabel || '').trim();
      if (!updates.roleLabel) return res.status(400).json({ message: 'roleLabel is required' });
    }
    if (req.body?.description !== undefined) updates.description = String(req.body.description || '').trim();
    if (req.body?.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body?.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder) || 0;
    const row = await OfficeRoleDefinition.findByIdAndUpdate(req.params.roleId, { $set: updates }, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!row) return res.status(404).json({ message: 'Office role not found' });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update office role' });
  }
}

async function deleteOfficeRole(req, res) {
  try {
    const removed = await OfficeRoleDefinition.findByIdAndDelete(req.params.roleId);
    if (!removed) return res.status(404).json({ message: 'Office role not found' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete office role' });
  }
}

async function listAssignments(req, res) {
  try {
    await OfficeAssignment.expireOverdue();
    const filter = {};
    if (req.query.userId) filter.user = String(req.query.userId);
    if (req.query.councilId) filter.council = String(req.query.councilId);
    if (req.query.regionId) filter.region = String(req.query.regionId);
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    const rows = await OfficeAssignment.find(filter)
      .populate('user', 'fullName email memberId')
      .populate('council', 'name abbreviation')
      .populate('region', 'name code')
      .populate('roleDefinition', 'roleKey roleLabel')
      .sort({ createdAt: -1 })
      .lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list office assignments' });
  }
}

async function createAssignment(req, res) {
  try {
    await OfficeAssignment.expireOverdue();
    const userIdRaw = String(req.body?.userId || '').trim();
    const emailRaw = String(req.body?.email || '').trim().toLowerCase();
    let user = null;
    if (userIdRaw) {
      user = await User.findById(userIdRaw).select('_id');
    } else if (emailRaw) {
      user = await User.findOne({ email: emailRaw }).select('_id');
    }
    if (!user) return res.status(404).json({ message: 'User not found (provide userId or email)' });
    const userId = String(user._id);

    let roleKey = String(req.body?.roleKey || '').trim().toUpperCase();
    let roleLabel = String(req.body?.roleLabel || '').trim();
    let roleDefinition = null;
    if (req.body?.roleDefinitionId) {
      roleDefinition = await OfficeRoleDefinition.findById(req.body.roleDefinitionId);
      if (!roleDefinition) return res.status(400).json({ message: 'Office role definition not found' });
      roleKey = roleDefinition.roleKey;
      roleLabel = roleDefinition.roleLabel;
    }
    if (!roleKey || !roleLabel) {
      return res.status(400).json({ message: 'roleKey and roleLabel (or roleDefinitionId) are required' });
    }

    const scopeType = String(req.body?.scopeType || 'COUNCIL').toUpperCase();
    let council = req.body?.councilId || null;
    let region = req.body?.regionId || null;
    let scopeId = req.body?.scopeId || null;

    if (region) {
      const regionDoc = await CouncilRegion.findById(region).select('council');
      if (!regionDoc) return res.status(400).json({ message: 'Region not found' });
      council = council || regionDoc.council;
      scopeId = scopeId || region;
    }
    if (council) {
      const c = await GlobalCouncil.findById(council).select('_id');
      if (!c) return res.status(400).json({ message: 'Council not found' });
      if (!scopeId && scopeType === 'COUNCIL') scopeId = council;
    }

    const startDate = req.body?.startDate ? new Date(req.body.startDate) : new Date();
    const endDate = req.body?.endDate ? new Date(req.body.endDate) : null;
    if (endDate && startDate && endDate < startDate) {
      return res.status(400).json({ message: 'endDate must be on or after startDate' });
    }

    const row = await OfficeAssignment.create({
      user: userId,
      roleDefinition: roleDefinition?._id || null,
      roleKey,
      roleLabel,
      council,
      region,
      scopeType,
      scopeId,
      startDate,
      endDate,
      status: String(req.body?.status || 'ACTIVE').toUpperCase(),
      appointedBy: req.user?._id || null,
      notes: String(req.body?.notes || '').trim(),
    });
    const populated = await OfficeAssignment.findById(row._id)
      .populate('user', 'fullName email memberId')
      .populate('council', 'name abbreviation')
      .populate('region', 'name code')
      .populate('roleDefinition', 'roleKey roleLabel');
    return res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create office assignment' });
  }
}

async function updateAssignment(req, res) {
  try {
    const row = await OfficeAssignment.findById(req.params.assignmentId);
    if (!row) return res.status(404).json({ message: 'Assignment not found' });
    if (req.body?.status !== undefined) row.status = String(req.body.status).toUpperCase();
    if (req.body?.endDate !== undefined) row.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    if (req.body?.startDate !== undefined) row.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    if (req.body?.notes !== undefined) row.notes = String(req.body.notes || '').trim();
    if (row.endDate && row.startDate && row.endDate < row.startDate) {
      return res.status(400).json({ message: 'endDate must be on or after startDate' });
    }
    if (row.endDate && row.endDate < new Date() && row.status === 'ACTIVE') {
      row.status = 'ENDED';
    }
    await row.save();
    const populated = await OfficeAssignment.findById(row._id)
      .populate('user', 'fullName email memberId')
      .populate('council', 'name abbreviation')
      .populate('region', 'name code')
      .populate('roleDefinition', 'roleKey roleLabel');
    return res.json(populated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update office assignment' });
  }
}

async function deleteAssignment(req, res) {
  try {
    const removed = await OfficeAssignment.findByIdAndDelete(req.params.assignmentId);
    if (!removed) return res.status(404).json({ message: 'Assignment not found' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete office assignment' });
  }
}

module.exports = {
  listOfficeRoles,
  createOfficeRole,
  updateOfficeRole,
  deleteOfficeRole,
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  ensureDefaultOfficeRoles,
};

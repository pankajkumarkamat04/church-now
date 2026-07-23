const CouncilRegion = require('../models/CouncilRegion');
const GlobalCouncil = require('../models/GlobalCouncil');
const User = require('../models/User');

async function listRegions(req, res) {
  try {
    const councilId = String(req.query.councilId || req.params.councilId || '').trim();
    const includeInactive =
      String(req.query.includeInactive || '') === '1' || String(req.query.all || '') === '1';
    const filter = {};
    if (councilId) filter.council = councilId;
    if (!includeInactive) filter.isActive = true;
    const rows = await CouncilRegion.find(filter)
      .populate('council', 'name abbreviation')
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list council regions' });
  }
}

async function getRegion(req, res) {
  try {
    const row = await CouncilRegion.findById(req.params.regionId)
      .populate('council', 'name abbreviation')
      .lean();
    if (!row) return res.status(404).json({ message: 'Region not found' });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load region' });
  }
}

async function createRegion(req, res) {
  try {
    const councilId = String(req.body?.councilId || req.body?.council || req.params.councilId || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!councilId || !name) {
      return res.status(400).json({ message: 'councilId and name are required' });
    }
    const council = await GlobalCouncil.findById(councilId).select('_id');
    if (!council) return res.status(400).json({ message: 'Council not found' });
    const row = await CouncilRegion.create({
      council: councilId,
      name,
      code: String(req.body?.code || '').trim().toUpperCase(),
      description: String(req.body?.description || '').trim(),
      isActive: req.body?.isActive === undefined ? true : Boolean(req.body.isActive),
      effectiveFrom: req.body?.effectiveFrom || null,
      effectiveTo: req.body?.effectiveTo || null,
      sortOrder: Number(req.body?.sortOrder) || 0,
    });
    return res.status(201).json(row);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Region name already exists for this council' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create region' });
  }
}

async function updateRegion(req, res) {
  try {
    const updates = {};
    if (req.body?.name !== undefined) {
      updates.name = String(req.body.name || '').trim();
      if (!updates.name) return res.status(400).json({ message: 'Region name is required' });
    }
    if (req.body?.code !== undefined) updates.code = String(req.body.code || '').trim().toUpperCase();
    if (req.body?.description !== undefined) updates.description = String(req.body.description || '').trim();
    if (req.body?.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body?.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder) || 0;
    if (req.body?.effectiveFrom !== undefined) updates.effectiveFrom = req.body.effectiveFrom || null;
    if (req.body?.effectiveTo !== undefined) updates.effectiveTo = req.body.effectiveTo || null;
    const row = await CouncilRegion.findByIdAndUpdate(req.params.regionId, { $set: updates }, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!row) return res.status(404).json({ message: 'Region not found' });
    return res.json(row);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Region name already exists for this council' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to update region' });
  }
}

async function deleteRegion(req, res) {
  try {
    const removed = await CouncilRegion.findByIdAndDelete(req.params.regionId);
    if (!removed) return res.status(404).json({ message: 'Region not found' });
    const oid = removed._id;
    const idStr = String(oid);
    await User.updateMany({}, { $pull: { councilRegionIds: { $in: [oid, idStr] } } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete region' });
  }
}

module.exports = {
  listRegions,
  getRegion,
  createRegion,
  updateRegion,
  deleteRegion,
};

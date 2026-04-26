const Church = require('../models/Church');

async function loadMainChurchOrThrow(churchId) {
  const church = await Church.findOne({ _id: churchId, churchType: 'MAIN' });
  if (!church) {
    const err = new Error('Main church not found');
    err.statusCode = 404;
    throw err;
  }
  return church;
}

async function listForMainChurch(req, res) {
  try {
    const church = await loadMainChurchOrThrow(req.params.churchId);
    const rows = Array.isArray(church.serviceCouncils) ? church.serviceCouncils : [];
    rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return res.json(rows);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || 'Failed to list service councils' });
  }
}

async function createForMainChurch(req, res) {
  try {
    const church = await loadMainChurchOrThrow(req.params.churchId);
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    if (!name) return res.status(400).json({ message: 'Service council name is required' });

    const duplicate = (church.serviceCouncils || []).some(
      (row) => String(row?.name || '').toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return res.status(409).json({ message: 'Service council name already exists' });

    church.serviceCouncils.push({ name, description, isActive: true });
    await church.save();
    const created = church.serviceCouncils[church.serviceCouncils.length - 1];
    return res.status(201).json(created);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || 'Failed to create service council' });
  }
}

async function updateForMainChurch(req, res) {
  try {
    const church = await loadMainChurchOrThrow(req.params.churchId);
    const target = church.serviceCouncils.id(req.params.serviceCouncilId);
    if (!target) return res.status(404).json({ message: 'Service council not found' });

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: 'Service council name is required' });
      const duplicate = (church.serviceCouncils || []).some(
        (row) =>
          String(row?._id) !== String(target._id) && String(row?.name || '').toLowerCase() === name.toLowerCase()
      );
      if (duplicate) return res.status(409).json({ message: 'Service council name already exists' });
      target.name = name;
    }
    if (req.body?.description !== undefined) {
      target.description = String(req.body.description || '').trim();
    }
    if (req.body?.isActive !== undefined) {
      target.isActive = Boolean(req.body.isActive);
    }

    await church.save();
    return res.json(target);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || 'Failed to update service council' });
  }
}

async function removeForMainChurch(req, res) {
  try {
    const church = await loadMainChurchOrThrow(req.params.churchId);
    const target = church.serviceCouncils.id(req.params.serviceCouncilId);
    if (!target) return res.status(404).json({ message: 'Service council not found' });
    target.deleteOne();
    await church.save();
    return res.status(204).send();
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || 'Failed to delete service council' });
  }
}

module.exports = {
  listForMainChurch,
  createForMainChurch,
  updateForMainChurch,
  removeForMainChurch,
};

const Asset = require('../models/Asset');
const { ASSET_CATEGORIES, ASSET_STATUSES, OWNERSHIP_TYPES } = Asset;

function churchId(req) {
  return req.user?.church;
}

function normalizeEnum(value, allowed, fallback) {
  const v = String(value || '')
    .trim()
    .toUpperCase();
  return allowed.includes(v) ? v : fallback;
}

function normalizeOptionalAmount(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function normalizeOptionalDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function toRow(assetDoc) {
  const a = assetDoc.toObject ? assetDoc.toObject() : assetDoc;
  return {
    _id: a._id,
    church: a.church,
    name: a.name,
    category: a.category,
    status: a.status,
    ownershipType: a.ownershipType,
    location: a.location || '',
    registrationNumber: a.registrationNumber || '',
    acquisitionDate: a.acquisitionDate || null,
    acquisitionCost: a.acquisitionCost ?? null,
    currentEstimatedValue: a.currentEstimatedValue ?? null,
    notes: a.notes || '',
    createdBy: a.createdBy || null,
    updatedBy: a.updatedBy || null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function applyAssetPatch(row, body) {
  if (body.name !== undefined) row.name = String(body.name || '').trim();
  if (body.category !== undefined) {
    row.category = normalizeEnum(body.category, ASSET_CATEGORIES, row.category || 'OTHER');
  }
  if (body.status !== undefined) {
    row.status = normalizeEnum(body.status, ASSET_STATUSES, row.status || 'ACTIVE');
  }
  if (body.ownershipType !== undefined) {
    row.ownershipType = normalizeEnum(body.ownershipType, OWNERSHIP_TYPES, row.ownershipType || 'OWNED');
  }
  if (body.location !== undefined) row.location = String(body.location || '').trim();
  if (body.registrationNumber !== undefined) row.registrationNumber = String(body.registrationNumber || '').trim();
  if (body.notes !== undefined) row.notes = String(body.notes || '').trim();
  if (body.acquisitionDate !== undefined) {
    const parsed = normalizeOptionalDate(body.acquisitionDate);
    if (parsed === undefined) return 'Invalid acquisitionDate';
    row.acquisitionDate = parsed;
  }
  if (body.acquisitionCost !== undefined) {
    const parsed = normalizeOptionalAmount(body.acquisitionCost);
    if (parsed === undefined) return 'acquisitionCost must be a valid non-negative number';
    row.acquisitionCost = parsed;
  }
  if (body.currentEstimatedValue !== undefined) {
    const parsed = normalizeOptionalAmount(body.currentEstimatedValue);
    if (parsed === undefined) return 'currentEstimatedValue must be a valid non-negative number';
    row.currentEstimatedValue = parsed;
  }
  if (!String(row.name || '').trim()) return 'name is required';
  return null;
}

async function listAdminAssets(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const category = String(req.query.category || '').trim().toUpperCase();
  const status = String(req.query.status || '').trim().toUpperCase();
  const q = { church: cid };
  if (ASSET_CATEGORIES.includes(category)) q.category = category;
  if (ASSET_STATUSES.includes(status)) q.status = status;
  const rows = await Asset.find(q).sort({ name: 1, createdAt: -1 });
  return res.json(rows.map(toRow));
}

async function createAdminAsset(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = new Asset({
    church: cid,
    name: String(req.body?.name || '').trim(),
    category: normalizeEnum(req.body?.category, ASSET_CATEGORIES, 'OTHER'),
    status: normalizeEnum(req.body?.status, ASSET_STATUSES, 'ACTIVE'),
    ownershipType: normalizeEnum(req.body?.ownershipType, OWNERSHIP_TYPES, 'OWNED'),
    location: String(req.body?.location || '').trim(),
    registrationNumber: String(req.body?.registrationNumber || '').trim(),
    notes: String(req.body?.notes || '').trim(),
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });
  const patchErr = applyAssetPatch(row, req.body || {});
  if (patchErr) return res.status(400).json({ message: patchErr });
  await row.save();
  return res.status(201).json(toRow(row));
}

async function updateAdminAsset(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Asset.findOne({ _id: req.params.assetId, church: cid });
  if (!row) return res.status(404).json({ message: 'Asset not found' });
  const patchErr = applyAssetPatch(row, req.body || {});
  if (patchErr) return res.status(400).json({ message: patchErr });
  row.updatedBy = req.user?._id || null;
  await row.save();
  return res.json(toRow(row));
}

async function removeAdminAsset(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await Asset.findOneAndDelete({ _id: req.params.assetId, church: cid });
  if (!row) return res.status(404).json({ message: 'Asset not found' });
  return res.status(204).send();
}

async function listSuperadminAssets(req, res) {
  const churchIdFilter = String(req.query.churchId || '').trim();
  const category = String(req.query.category || '').trim().toUpperCase();
  const status = String(req.query.status || '').trim().toUpperCase();
  const q = {};
  if (churchIdFilter) q.church = churchIdFilter;
  if (ASSET_CATEGORIES.includes(category)) q.category = category;
  if (ASSET_STATUSES.includes(status)) q.status = status;
  const rows = await Asset.find(q).populate('church', 'name').sort({ createdAt: -1, name: 1 }).limit(1500);
  return res.json(rows.map(toRow));
}

module.exports = {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  OWNERSHIP_TYPES,
  listAdminAssets,
  createAdminAsset,
  updateAdminAsset,
  removeAdminAsset,
  listSuperadminAssets,
};

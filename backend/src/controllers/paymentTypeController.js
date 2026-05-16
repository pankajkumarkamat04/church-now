const ChurchPaymentType = require('../models/ChurchPaymentType');
const {
  ensureChurchPaymentTypes,
  listChurchPaymentTypes,
  normalizeCode,
  isValidCode,
} = require('../utils/paymentTypes');
const { ensureTreasurerAccess } = require('../utils/treasurerAccess');

function churchId(req) {
  return req.user?.church;
}

function serialize(row) {
  return {
    _id: String(row._id),
    code: row.code,
    label: row.label,
    sortOrder: row.sortOrder ?? 0,
    isActive: Boolean(row.isActive),
    isSystem: Boolean(row.isSystem),
  };
}

async function listMemberPaymentTypes(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await listChurchPaymentTypes(cid, { activeOnly: true });
  return res.json(rows.map(serialize));
}

async function listAdminPaymentTypes(req, res) {
  if (!(await ensureTreasurerAccess(req, res))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await listChurchPaymentTypes(cid, { activeOnly: false });
  return res.json(rows.map(serialize));
}

async function createAdminPaymentType(req, res) {
  if (!(await ensureTreasurerAccess(req, res))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  await ensureChurchPaymentTypes(cid);

  const label = String(req.body?.label || '').trim();
  const code = normalizeCode(req.body?.code || label);
  if (!label) return res.status(400).json({ message: 'Label is required' });
  if (!code || !isValidCode(code)) {
    return res.status(400).json({ message: 'Code must be 1–32 characters (letters, numbers, underscore)' });
  }

  const exists = await ChurchPaymentType.findOne({ church: cid, code });
  if (exists) return res.status(409).json({ message: 'A payment category with this code already exists' });

  const maxSort = await ChurchPaymentType.findOne({ church: cid }).sort({ sortOrder: -1 }).select('sortOrder').lean();
  const row = await ChurchPaymentType.create({
    church: cid,
    code,
    label,
    sortOrder: Number(maxSort?.sortOrder ?? 0) + 1,
    isActive: true,
    isSystem: false,
  });
  return res.status(201).json(serialize(row));
}

async function updateAdminPaymentType(req, res) {
  if (!(await ensureTreasurerAccess(req, res))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await ChurchPaymentType.findOne({ _id: req.params.typeId, church: cid });
  if (!row) return res.status(404).json({ message: 'Payment category not found' });

  if (req.body?.label != null) {
    const label = String(req.body.label).trim();
    if (!label) return res.status(400).json({ message: 'Label cannot be empty' });
    row.label = label;
  }
  if (req.body?.sortOrder != null) {
    const n = Number(req.body.sortOrder);
    if (Number.isFinite(n)) row.sortOrder = n;
  }
  if (req.body?.isActive != null) {
    row.isActive = Boolean(req.body.isActive);
  }

  await row.save();
  return res.json(serialize(row));
}

async function removeAdminPaymentType(req, res) {
  if (!(await ensureTreasurerAccess(req, res))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const row = await ChurchPaymentType.findOne({ _id: req.params.typeId, church: cid });
  if (!row) return res.status(404).json({ message: 'Payment category not found' });
  if (row.isSystem) {
    return res.status(400).json({ message: 'Built-in categories cannot be deleted. Deactivate instead.' });
  }
  await row.deleteOne();
  return res.json({ message: 'Payment category removed' });
}

module.exports = {
  listMemberPaymentTypes,
  listAdminPaymentTypes,
  createAdminPaymentType,
  updateAdminPaymentType,
  removeAdminPaymentType,
};

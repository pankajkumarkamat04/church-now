const ChurchPaymentType = require('../models/ChurchPaymentType');

/** Built-in defaults seeded for each church on first use. */
const DEFAULT_PAYMENT_TYPES = [
  { code: 'TITHE', label: 'Tithe', isSystem: true },
  { code: 'BUILDING', label: 'Building', isSystem: true },
  { code: 'ROOF', label: 'Roof', isSystem: true },
  { code: 'GAZALAND', label: 'Gazaland', isSystem: true },
  { code: 'UTC', label: 'UTC', isSystem: true },
  { code: 'THANKS', label: 'Thanks', isSystem: true },
  { code: 'MUSIC', label: 'Music', isSystem: true },
  { code: 'XMAS', label: 'Xmas', isSystem: true },
  { code: 'HARVEST', label: 'Harvest', isSystem: true },
];

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function isValidCode(code) {
  return /^[A-Z][A-Z0-9_]{0,31}$/.test(code);
}

async function ensureChurchPaymentTypes(churchId) {
  const cid = String(churchId || '');
  if (!cid) return [];
  const count = await ChurchPaymentType.countDocuments({ church: cid });
  if (count > 0) {
    return ChurchPaymentType.find({ church: cid }).sort({ sortOrder: 1, label: 1 }).lean();
  }
  const docs = DEFAULT_PAYMENT_TYPES.map((row, index) => ({
    church: cid,
    code: row.code,
    label: row.label,
    sortOrder: index,
    isActive: true,
    isSystem: row.isSystem,
  }));
  await ChurchPaymentType.insertMany(docs, { ordered: true });
  return ChurchPaymentType.find({ church: cid }).sort({ sortOrder: 1, label: 1 }).lean();
}

async function listChurchPaymentTypes(churchId, { activeOnly = false } = {}) {
  const cid = String(churchId || '');
  if (!cid) return [];
  await ensureChurchPaymentTypes(cid);
  const filter = { church: cid };
  if (activeOnly) filter.isActive = true;
  return ChurchPaymentType.find(filter).sort({ sortOrder: 1, label: 1 }).lean();
}

async function getActivePaymentTypeCodes(churchId) {
  const rows = await listChurchPaymentTypes(churchId, { activeOnly: true });
  return rows.map((r) => r.code);
}

function normalizeAmountsByOption(input, activeCodes) {
  const codes = Array.isArray(activeCodes) ? activeCodes : [];
  const result = {};
  for (const code of codes) {
    const raw = input && Object.prototype.hasOwnProperty.call(input, code) ? input[code] : 0;
    const numeric = Number(raw);
    result[code] = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }
  if (input && typeof input === 'object') {
    for (const [key, raw] of Object.entries(input)) {
      const code = normalizeCode(key);
      if (!code || Object.prototype.hasOwnProperty.call(result, code)) continue;
      const numeric = Number(raw);
      if (Number.isFinite(numeric) && numeric > 0) result[code] = numeric;
    }
  }
  return result;
}

function validatePaymentLineTypes(types, activeCodes) {
  const activeSet = new Set((activeCodes || []).map((c) => normalizeCode(c)));
  for (const t of types || []) {
    const code = normalizeCode(t);
    if (!code) return 'Invalid payment type';
    if (!activeSet.has(code)) {
      return `Payment type "${code}" is not active for this church. Choose from: ${[...activeSet].join(', ')}`;
    }
  }
  return null;
}

module.exports = {
  DEFAULT_PAYMENT_TYPES,
  normalizeCode,
  isValidCode,
  ensureChurchPaymentTypes,
  listChurchPaymentTypes,
  getActivePaymentTypeCodes,
  normalizeAmountsByOption,
  validatePaymentLineTypes,
};

const GlobalCouncil = require('../models/GlobalCouncil');

/**
 * Validates global council IDs for membership. Requires at least one active council.
 * @returns {{ ids: string[] } | { error: string }}
 */
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

module.exports = { normalizeAndValidateGlobalCouncilIds };

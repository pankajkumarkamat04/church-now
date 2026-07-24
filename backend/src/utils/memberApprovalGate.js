const { GENDERS } = require('../models/User');

/**
 * Optional profile completeness for UI badges only.
 * Approval is allowed without these fields — members can complete them after login.
 * @param {import('mongoose').Document | object} member
 * @returns {string|null} Hint message when incomplete, or null if complete
 */
function getMemberApprovalBlockers(member) {
  const missing = [];
  const firstName = String(member.firstName || '').trim();
  const surname = String(member.surname || '').trim();
  const fullName = String(member.fullName || '').trim();
  if (!firstName && !surname && !fullName) missing.push('name');
  if (!String(member.contactPhone || '').trim()) missing.push('contact phone');
  if (!String(member.idNumber || '').trim()) missing.push('national ID / passport number');
  if (!member.dateOfBirth) missing.push('date of birth');
  const gender = String(member.gender || '').toUpperCase();
  if (!GENDERS.includes(gender)) missing.push('sex');
  const addr = member.address && typeof member.address === 'object' ? member.address : {};
  if (!String(addr.line1 || '').trim()) missing.push('address line 1');
  if (!String(addr.city || '').trim()) missing.push('city');
  if (!String(addr.stateOrProvince || '').trim()) missing.push('province / region');
  if (!String(addr.country || '').trim()) missing.push('country');
  const councils = Array.isArray(member.councilIds) ? member.councilIds : [];
  if (councils.length === 0) missing.push('at least one council');
  if (!member.church) missing.push('church');

  if (missing.length === 0) return null;
  return `Optional profile fields still empty: ${missing.join(', ')}. Member can complete these after approval.`;
}

module.exports = {
  getMemberApprovalBlockers,
};

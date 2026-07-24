const { GENDERS } = require('../models/User');

/**
 * Fields that must be completed by admin before a self-registered member can be approved/activated.
 * @param {import('mongoose').Document | object} member
 * @returns {string|null} Error message, or null if ready
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
  return `Complete the member profile before approval. Missing: ${missing.join(', ')}.`;
}

function assertMemberReadyForApproval(member) {
  const msg = getMemberApprovalBlockers(member);
  if (msg) {
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
}

module.exports = {
  getMemberApprovalBlockers,
  assertMemberReadyForApproval,
};

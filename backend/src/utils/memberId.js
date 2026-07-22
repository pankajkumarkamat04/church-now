const User = require('../models/User');

/** Human-readable member number prefix (globally unique). */
const AUTO_PREFIX = 'UCCZ-';
const AUTO_PATTERN = new RegExp(`^${AUTO_PREFIX}\\d{6}$`);
const LEGACY_MEM_PATTERN = /^MEM-\d{6}$/i;

/**
 * Format a sequential number as UCCZ-000001.
 */
function formatMemberId(num) {
  return `${AUTO_PREFIX}${String(num).padStart(6, '0')}`;
}

/**
 * Highest existing UCCZ-###### number in the database (0 if none).
 */
async function maxAutoMemberIdNumber() {
  const members = await User.find({ memberId: AUTO_PATTERN }).select('memberId').lean();
  let maxNum = 0;
  for (const m of members) {
    const n = parseInt(String(m.memberId || '').slice(AUTO_PREFIX.length), 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return maxNum;
}

/**
 * Next auto member ID across the whole system (globally unique).
 */
async function peekNextAutoMemberId() {
  const maxNum = await maxAutoMemberIdNumber();
  return formatMemberId(maxNum + 1);
}

/**
 * Resolve a globally unique memberId.
 * If requested is non-empty, use it after a global duplicate check; otherwise auto-assign UCCZ-000001+.
 * `churchId` is still required for assignment context (member must belong to a church).
 */
async function resolveMemberIdForChurch(churchId, requestedRaw) {
  if (!churchId) {
    const err = new Error('Church is required for member ID');
    err.statusCode = 400;
    throw err;
  }
  const requested = requestedRaw != null ? String(requestedRaw).trim() : '';
  if (requested) {
    const dup = await User.findOne({ memberId: requested }).select('_id');
    if (dup) {
      const err = new Error('This member ID is already in use');
      err.statusCode = 400;
      throw err;
    }
    return requested;
  }

  // Retry briefly in case of concurrent creates racing on the same next number.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = await peekNextAutoMemberId();
    const exists = await User.findOne({ memberId: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }
  const err = new Error('Could not allocate a unique member ID; try again');
  err.statusCode = 503;
  throw err;
}

/**
 * Reassign duplicate non-empty memberIds so a global unique index can be applied.
 * Keeps the earliest document (by createdAt / _id); later duplicates get a new UCCZ-######.
 */
async function dedupeGlobalMemberIds() {
  const groups = await User.aggregate([
    { $match: { memberId: { $gt: '' } } },
    {
      $group: {
        _id: '$memberId',
        docs: { $push: { id: '$_id', createdAt: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let reassigned = 0;
  for (const group of groups) {
    const sorted = [...group.docs].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    });
    const duplicates = sorted.slice(1);
    for (const doc of duplicates) {
      const nextId = await peekNextAutoMemberId();
      await User.updateOne({ _id: doc.id }, { $set: { memberId: nextId } });
      reassigned += 1;
    }
  }
  return reassigned;
}

/**
 * Full rewrite: assign sequential UCCZ-000001+ to every user who should have a member ID,
 * converting legacy MEM-* / custom / duplicate / missing values. SUPERADMIN stays without one.
 *
 * Strategy (collision-safe):
 * 1) Stage all targets with temporary unique IDs
 * 2) Assign final UCCZ-###### in createdAt order
 * 3) Ensure unique index
 *
 * @returns {{ updated: number, assigned: number, unchanged: number, total: number }}
 */
async function rewriteAllMemberIdsToUccz() {
  const users = await User.find({
    role: { $ne: 'SUPERADMIN' },
    $or: [
      { role: 'MEMBER' },
      { role: 'ADMIN' },
      { role: 'CHURCH_ADMIN' },
      { memberId: { $gt: '' } },
    ],
  })
    .select('_id memberId role createdAt')
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  // Only keep users that should carry a public member number.
  const eligible = users.filter((u) => {
    if (u.role === 'MEMBER') return true;
    if (String(u.memberId || '').trim()) return true;
    if (u.role === 'ADMIN' || u.role === 'CHURCH_ADMIN') return true;
    return false;
  });

  const byId = new Map();
  for (const u of eligible) {
    byId.set(String(u._id), u);
  }
  const ordered = [...byId.values()].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a._id).localeCompare(String(b._id));
  });

  const stamp = Date.now().toString(36);
  // Phase 1: unique temporary IDs so we never collide while rewriting.
  for (let i = 0; i < ordered.length; i += 1) {
    const tempId = `__TMP_UCCZ_${stamp}_${i}__`;
    await User.updateOne({ _id: ordered[i]._id }, { $set: { memberId: tempId } });
  }

  let updated = 0;
  let assigned = 0;
  let unchanged = 0;

  // Phase 2: final sequential UCCZ- IDs.
  for (let i = 0; i < ordered.length; i += 1) {
    const u = ordered[i];
    const nextId = formatMemberId(i + 1);
    const prev = String(u.memberId || '').trim();
    await User.updateOne({ _id: u._id }, { $set: { memberId: nextId } });
    if (!prev) assigned += 1;
    else if (prev === nextId) unchanged += 1;
    else updated += 1;
  }

  return {
    updated,
    assigned,
    unchanged,
    total: ordered.length,
  };
}

function isMemberIdDuplicateKeyError(err) {
  return Boolean(err && err.code === 11000 && err.keyPattern && err.keyPattern.memberId);
}

module.exports = {
  AUTO_PREFIX,
  AUTO_PATTERN,
  LEGACY_MEM_PATTERN,
  formatMemberId,
  resolveMemberIdForChurch,
  dedupeGlobalMemberIds,
  rewriteAllMemberIdsToUccz,
  isMemberIdDuplicateKeyError,
  peekNextAutoMemberId,
  maxAutoMemberIdNumber,
};

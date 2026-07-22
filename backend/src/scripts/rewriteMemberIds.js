/**
 * Rewrites every member ID in the database to the UCCZ-###### format,
 * fixes duplicates, and ensures the global unique index.
 *
 * Dry-run (default):
 *   npm run rewrite:member-ids
 *
 * Apply changes (separate confirm script):
 *   npm run rewrite:member-ids:confirm
 *
 * PowerShell:
 *   $env:REWRITE_MEMBER_IDS_CONFIRM="yes"; npm run rewrite:member-ids
 */
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const {
  AUTO_PREFIX,
  rewriteAllMemberIdsToUccz,
  dedupeGlobalMemberIds,
} = require('../utils/memberId');

function hasConfirmFlag() {
  if (process.env.REWRITE_MEMBER_IDS_CONFIRM === 'yes') return true;
  return process.argv.includes('--confirm');
}

function databaseNameFromUri(uri) {
  try {
    const path = new URL(uri).pathname.replace(/^\//, '');
    return path.split('?')[0] || '(default)';
  } catch {
    const match = String(uri).match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : '(unknown)';
  }
}

async function summarizeMemberIds() {
  const totalWithId = await User.countDocuments({ memberId: { $gt: '' } });
  const legacyMem = await User.countDocuments({ memberId: /^MEM-\d{6}$/i });
  const uccz = await User.countDocuments({ memberId: new RegExp(`^${AUTO_PREFIX}\\d{6}$`) });
  const emptyMembers = await User.countDocuments({
    role: 'MEMBER',
    $or: [{ memberId: '' }, { memberId: null }, { memberId: { $exists: false } }],
  });
  const dupGroups = await User.aggregate([
    { $match: { memberId: { $gt: '' } } },
    { $group: { _id: '$memberId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'n' },
  ]);
  const duplicateGroups = dupGroups[0]?.n || 0;
  const samples = await User.find({ memberId: { $gt: '' } })
    .select('email memberId role')
    .sort({ createdAt: 1 })
    .limit(8)
    .lean();

  return { totalWithId, legacyMem, uccz, emptyMembers, duplicateGroups, samples };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env first.');
    process.exit(1);
  }

  const confirm = hasConfirmFlag();
  await mongoose.connect(uri);
  const dbName = databaseNameFromUri(uri);

  console.log(`Connected to database: ${dbName}`);
  console.log(`Target prefix: ${AUTO_PREFIX}###### (example ${AUTO_PREFIX}000001)`);
  console.log('');

  const before = await summarizeMemberIds();
  console.log('Before:');
  console.log(`  Users with memberId:     ${before.totalWithId}`);
  console.log(`  Legacy MEM-######:       ${before.legacyMem}`);
  console.log(`  Already ${AUTO_PREFIX}######:   ${before.uccz}`);
  console.log(`  MEMBERs missing ID:      ${before.emptyMembers}`);
  console.log(`  Duplicate ID groups:     ${before.duplicateGroups}`);
  if (before.samples.length) {
    console.log('  Sample IDs:');
    for (const s of before.samples) {
      console.log(`    ${s.memberId}  ${s.role}  ${s.email}`);
    }
  }
  console.log('');

  if (!confirm) {
    console.log(
      'Dry-run only. No changes written.\n' +
        'To apply, run the separate confirm script:\n' +
        '  npm run rewrite:member-ids:confirm'
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Applying rewrite…');
  // Clear unique index temporarily so mid-rewrite temps / renumbers cannot collide on old index shape.
  try {
    await User.collection.dropIndex('memberId_1');
    console.log('  Dropped memberId_1 index (will recreate)');
  } catch (e) {
    if (e?.codeName !== 'IndexNotFound' && e?.code !== 27) {
      console.warn('  Could not drop memberId_1 (continuing):', e.message || e);
    }
  }

  const result = await rewriteAllMemberIdsToUccz();
  const stillDupes = await dedupeGlobalMemberIds();
  await User.syncIndexes();

  const after = await summarizeMemberIds();
  console.log('');
  console.log('Rewrite complete:');
  console.log(`  Processed:   ${result.total}`);
  console.log(`  Updated:     ${result.updated}`);
  console.log(`  Newly set:   ${result.assigned}`);
  console.log(`  Unchanged:   ${result.unchanged}`);
  console.log(`  Extra dedupe fixes: ${stillDupes}`);
  console.log('');
  console.log('After:');
  console.log(`  Users with memberId:     ${after.totalWithId}`);
  console.log(`  Legacy MEM-######:       ${after.legacyMem}`);
  console.log(`  ${AUTO_PREFIX}######:           ${after.uccz}`);
  console.log(`  MEMBERs missing ID:      ${after.emptyMembers}`);
  console.log(`  Duplicate ID groups:     ${after.duplicateGroups}`);
  if (after.samples.length) {
    console.log('  Sample IDs:');
    for (const s of after.samples) {
      console.log(`    ${s.memberId}  ${s.role}  ${s.email}`);
    }
  }

  if (after.duplicateGroups > 0 || after.legacyMem > 0) {
    console.error('\nWarning: leftovers remain. Inspect the database before going live.');
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log('\nAll member IDs are unique and use the UCCZ- prefix.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

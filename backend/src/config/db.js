const mongoose = require('mongoose');
const Church = require('../models/Church');
const Conference = require('../models/Conference');
const User = require('../models/User');
const AttendanceSession = require('../models/AttendanceSession');
const { dedupeGlobalMemberIds } = require('../utils/memberId');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(uri);
  // Resolve cross-church duplicate memberIds before applying the global unique index.
  const reassigned = await dedupeGlobalMemberIds();
  if (reassigned > 0) {
    console.warn(`[db] Reassigned ${reassigned} duplicate memberId value(s) for global uniqueness`);
  }
  // Keep DB indexes aligned with current schemas to avoid stale unique-index collisions.
  await Promise.all([Church.syncIndexes(), Conference.syncIndexes(), User.syncIndexes(), AttendanceSession.syncIndexes()]);
  // Removed from schema: drop legacy field from existing documents (idempotent).
  await User.collection.updateMany({}, { $unset: { churchRole: '' } });
}

module.exports = { connectDB };

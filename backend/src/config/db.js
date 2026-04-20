const mongoose = require('mongoose');
const Church = require('../models/Church');
const Conference = require('../models/Conference');
const User = require('../models/User');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(uri);
  // Keep DB indexes aligned with current schemas to avoid stale unique-index collisions.
  await Promise.all([Church.syncIndexes(), Conference.syncIndexes(), User.syncIndexes()]);
}

module.exports = { connectDB };

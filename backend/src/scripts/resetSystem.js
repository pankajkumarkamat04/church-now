/**
 * Wipes the entire MongoDB database (MONGODB_URI) and creates one superadmin.
 * This is the only backend maintenance script — use for fresh local setup or full reset.
 *
 *   npm run reset:system:confirm
 *
 * PowerShell alternative:
 *   $env:RESET_SYSTEM_CONFIRM="yes"; npm run reset:system
 *
 * Optional .env: SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_FULL_NAME
 */require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

function hasConfirmFlag() {
  if (process.env.RESET_SYSTEM_CONFIRM === 'yes') return true;
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

async function main() {
  if (!hasConfirmFlag()) {
    console.error(
      'Refusing to run without confirmation.\n' +
        'This deletes ALL data in the database configured by MONGODB_URI.\n\n' +
        'Run:  npm run reset:system:confirm\n' +
        'Or:   npm run reset:system -- --confirm\n' +
        'PowerShell:  $env:RESET_SYSTEM_CONFIRM="yes"; npm run reset:system'
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env first.');
    process.exit(1);
  }

  const email = (process.env.SUPERADMIN_EMAIL || 'admin@test.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || 'admin123';

  if (!email) {
    console.error('SUPERADMIN_EMAIL is empty.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('SUPERADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const dbName = databaseNameFromUri(uri);
  console.log('Connecting to:', uri.replace(/\/\/([^@/]+@)?/, '//***@'));
  console.log('Database to wipe:', dbName);

  await mongoose.connect(uri);

  const { db } = mongoose.connection;
  const collectionsBefore = await db.listCollections().toArray();
  console.log('Collections before reset:', collectionsBefore.length);

  await db.dropDatabase();
  console.log('Dropped database:', dbName);

  await User.create({
    email,
    password,
    fullName: process.env.SUPERADMIN_FULL_NAME || 'System Superadmin',
    role: 'SUPERADMIN',
    church: null,
    isActive: true,
    approvalStatus: 'APPROVED',
  });

  await User.syncIndexes();

  const collectionsAfter = await db.listCollections().toArray();
  console.log('Collections after reset:', collectionsAfter.length);
  console.log('');
  console.log('Done. Log in with:');
  console.log('  Email:   ', email);
  console.log('  Password:', password);

  await mongoose.disconnect();
  process.exit(0);
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

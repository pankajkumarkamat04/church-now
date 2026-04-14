/**
 * First-time setup: copy .env.example to .env, start MongoDB, then run:
 *   npm run seed:superadmin
 *
 * 1. Deletes all church admins (role ADMIN)
 * 2. Removes an existing superadmin with the same seed email (if any)
 * 3. Creates one superadmin
 *
 * Defaults: admin@test.com / admin123
 * Override with SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env
 */
require('dotenv').config();

const { connectDB } = require('../config/db');
const User = require('../models/User');

async function main() {
  await connectDB();

  const email = (process.env.SUPERADMIN_EMAIL || 'admin@test.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || 'admin123';

  const adminResult = await User.deleteMany({ role: 'ADMIN' });
  console.log('Removed church admins:', adminResult.deletedCount);

  const removedSuper = await User.deleteOne({ email, role: 'SUPERADMIN' });
  if (removedSuper.deletedCount > 0) {
    console.log('Removed existing superadmin for:', email);
  }

  await User.create({
    email,
    password,
    fullName: 'System Superadmin',
    role: 'SUPERADMIN',
    church: null,
  });

  console.log('Created superadmin — email:', email, '| password:', password);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

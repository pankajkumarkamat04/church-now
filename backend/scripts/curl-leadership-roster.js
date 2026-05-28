require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
require('../src/models/Church');
const { signToken } = require('../src/utils/token');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const admin = await User.findOne({ role: 'SUPERADMIN' }).lean();
  if (!admin) throw new Error('No superadmin');
  const token = signToken({ sub: String(admin._id), role: admin.role });
  const base = 'http://localhost:5000';
  for (const pool of ['pastors', 'lay']) {
    const res = await fetch(`${base}/api/superadmin/leadership-roster?pool=${pool}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    console.log(pool, res.status, text.slice(0, 500));
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

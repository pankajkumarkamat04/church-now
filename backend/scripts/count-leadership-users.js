require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const total = await User.countDocuments({});
  const memberAdmin = await User.countDocuments({ role: { $in: ['MEMBER', 'ADMIN'] } });
  const active = await User.countDocuments({ role: { $in: ['MEMBER', 'ADMIN'] }, isActive: true });
  const activeRelaxed = await User.countDocuments({
    role: { $in: ['MEMBER', 'ADMIN'] },
    isActive: { $ne: false },
  });
  const lay = await User.countDocuments({
    role: { $in: ['MEMBER', 'ADMIN'] },
    isActive: { $ne: false },
    memberCategory: { $ne: 'PASTOR' },
  });
  const pastors = await User.countDocuments({
    role: { $in: ['MEMBER', 'ADMIN'] },
    isActive: { $ne: false },
    memberCategory: 'PASTOR',
  });
  const roles = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
  const cats = await User.aggregate([{ $group: { _id: '$memberCategory', n: { $sum: 1 } } }]);
  const activeVals = await User.aggregate([{ $group: { _id: '$isActive', n: { $sum: 1 } } }]);
  console.log(JSON.stringify({ total, memberAdmin, active, activeRelaxed, lay, pastors, roles, cats, activeVals }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

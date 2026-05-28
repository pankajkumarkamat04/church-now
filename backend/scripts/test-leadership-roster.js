require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function roster(pool) {
  const filter = { role: { $in: ['MEMBER', 'ADMIN'] }, isActive: true };
  if (pool === 'pastors') filter.memberCategory = 'PASTOR';
  else if (pool === 'lay') filter.memberCategory = { $ne: 'PASTOR' };
  const users = await User.find(filter)
    .populate({
      path: 'church',
      select: 'name conference churchType',
      populate: { path: 'conference', select: '_id name' },
    })
    .sort({ fullName: 1, email: 1 })
    .select('-password')
    .limit(3000)
    .lean();
  return users.map((u) => ({
    id: String(u._id),
    email: u.email,
    fullName: u.fullName,
    memberCategory: u.memberCategory,
    church: u.church,
  }));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const pastors = await roster('pastors');
  const lay = await roster('lay');
  console.log('pastors', pastors.length, pastors.map((u) => u.email));
  console.log('lay', lay.length, lay.map((u) => u.email));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const mongoose = require('mongoose');

async function clean(dbName) {
  console.log('Cleaning ' + dbName);
  const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/' + dbName).asPromise();
  
  // Define schema without strict index building to prevent crashes while cleaning
  const schemaObj = require('./src/models/User').schema.obj;
  const UserSchema = new mongoose.Schema(schemaObj, { autoIndex: false });
  const User = conn.model('User', UserSchema);

  const dups = await User.aggregate([
    { $match: { memberId: { $gt: '' } } },
    { $group: { _id: { church: '$church', memberId: '$memberId' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (dups.length > 0) {
    console.log('Found ' + dups.length + ' duplicates in ' + dbName);
    for (const dup of dups) {
      // dup.ids is an array of IDs that share the same church and memberId
      // Keep the first one, delete the rest
      for (let i = 1; i < dup.ids.length; i++) {
        const idToDelete = dup.ids[i];
        await User.deleteOne({ _id: idToDelete });
        console.log('Deleted duplicate: ' + idToDelete);
      }
    }
  } else {
    console.log('No duplicates found in ' + dbName);
  }
  await conn.close();
}

async function main() {
  await clean('church_management');
  await clean('church');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

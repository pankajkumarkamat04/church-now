const { MongoClient } = require('mongodb');

async function clean(dbName) {
  console.log('Cleaning ' + dbName);
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db(dbName);
  const collection = db.collection('users');

  const dups = await collection.aggregate([
    { $match: { memberId: { $gt: '' }, church: { $ne: null } } },
    { $group: { _id: { church: '$church', memberId: '$memberId' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (dups.length > 0) {
    console.log('Found ' + dups.length + ' duplicates in ' + dbName);
    for (const dup of dups) {
      for (let i = 1; i < dup.ids.length; i++) {
        const idToDelete = dup.ids[i];
        await collection.deleteOne({ _id: idToDelete });
        console.log('Deleted duplicate: ' + idToDelete);
      }
    }
  } else {
    console.log('No duplicates found in ' + dbName);
  }
  await client.close();
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

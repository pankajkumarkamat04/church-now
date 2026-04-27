require('dotenv').config();

const mongoose = require('mongoose');
const { Payment } = require('../models/Payment');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);

  // Legacy payment docs used removed fields like paymentOption/optionAmounts
  // and do not carry the new paymentLines array payload.
  const legacyFilter = {
    $or: [
      { paymentLines: { $exists: false } },
      { paymentLines: { $size: 0 } },
      { paymentOption: { $exists: true, $ne: null } },
      { optionAmounts: { $exists: true, $ne: {} } },
    ],
  };

  const count = await Payment.countDocuments(legacyFilter);
  if (count === 0) {
    console.log('No legacy payment records found.');
    await mongoose.disconnect();
    return;
  }

  const result = await Payment.deleteMany(legacyFilter);
  console.log(`Deleted legacy payment records: ${result.deletedCount}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to clean legacy payment records:', err.message);
  process.exit(1);
});

const Church = require('../models/Church');

async function assertChurchById(churchId) {
  const church = await Church.findById(churchId);
  if (!church) {
    const err = new Error('Church not found');
    err.status = 404;
    throw err;
  }
  return church;
}

module.exports = { assertChurchById };

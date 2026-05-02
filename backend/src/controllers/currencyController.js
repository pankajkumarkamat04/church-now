const { getUsdBasedRates } = require('../services/exchangeRates');

async function getPublicRates(_req, res) {
  try {
    const data = await getUsdBasedRates();
    return res.json({
      ...data,
      /** USD value of 1 unit of display currency (for audit / UI) */
      usdPerUnit: {
        USD: 1,
        ZAR: 1 / data.foreignPerUsd.ZAR,
        ZWG: 1 / data.foreignPerUsd.ZWG,
      },
    });
  } catch (err) {
    const status = err.statusCode || 503;
    return res.status(status).json({
      message: err.message || 'Exchange rates unavailable',
    });
  }
}

module.exports = {
  getPublicRates,
};

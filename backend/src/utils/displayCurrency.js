const { getUsdBasedRates } = require('../services/exchangeRates');

const DISPLAY_CODES = ['USD', 'ZAR', 'ZWG'];

/**
 * @param {string} [input]
 * @returns {'USD'|'ZAR'|'ZWG'}
 */
function normalizeDisplayCurrency(input) {
  const raw = String(input || 'USD')
    .trim()
    .toUpperCase();
  if (raw === 'ZIG' || raw === 'ZWL') return 'ZWG';
  if (DISPLAY_CODES.includes(raw)) return raw;
  return 'USD';
}

/**
 * foreignPerUsd: ZAR means how many rand per 1 USD.
 * @param {'USD'|'ZAR'|'ZWG'} display
 * @param {number} amountDisplay amount entered in display currency (for non-USD: units of ZAR/ZWG)
 */
async function convertDisplayAmountToUsd(display, amountDisplay) {
  const amt = Number(amountDisplay);
  if (!Number.isFinite(amt) || amt < 0) {
    throw Object.assign(new Error('Valid amount is required'), { statusCode: 400 });
  }
  if (display === 'USD') {
    return {
      amountUsd: amt,
      fxUsdPerUnit: 1,
      amountDisplay: amt,
      displayCurrency: 'USD',
    };
  }
  const { foreignPerUsd } = await getUsdBasedRates();
  const perUsd = foreignPerUsd[display];
  if (!Number.isFinite(perUsd) || perUsd <= 0) {
    throw Object.assign(new Error(`No exchange rate for ${display}`), { statusCode: 503 });
  }
  const fxUsdPerUnit = 1 / perUsd;
  return {
    amountUsd: amt / perUsd,
    fxUsdPerUnit,
    amountDisplay: amt,
    displayCurrency: display,
  };
}

module.exports = {
  DISPLAY_CODES,
  normalizeDisplayCurrency,
  convertDisplayAmountToUsd,
};

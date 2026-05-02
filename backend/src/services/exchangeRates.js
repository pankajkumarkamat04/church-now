/**
 * Live FX from open.er-api.com (USD base). Rates are foreign currency units per 1 USD.
 * Cache briefly to limit outbound calls.
 */

const TTL_MS = 10 * 60 * 1000;

let cache = {
  at: 0,
  foreignPerUsd: null,
  raw: null,
};

async function fetchOpenErUsdRates() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Exchange rate request failed (${res.status})`);
  }
  const data = await res.json();
  if (data.result !== 'success' || !data.rates || typeof data.rates !== 'object') {
    throw new Error('Unexpected exchange rate payload');
  }
  return data;
}

/**
 * @returns {{ foreignPerUsd: { ZAR: number, ZWG: number }, fetchedAt: string, source: string }}
 */
async function getUsdBasedRates() {
  const now = Date.now();
  if (cache.foreignPerUsd && now - cache.at < TTL_MS) {
    return cache.raw;
  }

  const data = await fetchOpenErUsdRates();
  const zar = Number(data.rates.ZAR);
  let zwg = Number(data.rates.ZWG);

  if (!Number.isFinite(zar) || zar <= 0) {
    throw new Error('Exchange rates unavailable for ZAR');
  }
  if (!Number.isFinite(zwg) || zwg <= 0) {
    const fallback = Number(process.env.EXCHANGE_FALLBACK_ZWG_PER_USD);
    if (Number.isFinite(fallback) && fallback > 0) {
      zwg = fallback;
    } else {
      throw new Error('Exchange rates unavailable for ZWG (ZiG). Set EXCHANGE_FALLBACK_ZWG_PER_USD if needed.');
    }
  }

  cache.foreignPerUsd = { ZAR: zar, ZWG: zwg };

  const payload = {
    foreignPerUsd: { ...cache.foreignPerUsd },
    fetchedAt: new Date().toISOString(),
    source: 'open.er-api.com',
  };
  cache.at = now;
  cache.raw = payload;
  return payload;
}

module.exports = {
  getUsdBasedRates,
};

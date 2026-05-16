const MAX_TERM_CYCLES = 2;
const ALLOWED_TERM_LENGTH_YEARS = [1, 4];

function parseTermLengthYears(value) {
  const n = Number(value);
  if (ALLOWED_TERM_LENGTH_YEARS.includes(n)) return n;
  return 4;
}

function maxTotalYears(termLengthYears) {
  return parseTermLengthYears(termLengthYears) * MAX_TERM_CYCLES;
}

function maxTermsReachedMessage(termLengthYears) {
  const years = maxTotalYears(termLengthYears);
  const len = parseTermLengthYears(termLengthYears);
  return `Maximum ${years} year${years === 1 ? '' : 's'} reached (${MAX_TERM_CYCLES} × ${len}-year term${len === 1 ? '' : 's'}). Pastor must be transferred.`;
}

module.exports = {
  MAX_TERM_CYCLES,
  ALLOWED_TERM_LENGTH_YEARS,
  parseTermLengthYears,
  maxTotalYears,
  maxTermsReachedMessage,
};

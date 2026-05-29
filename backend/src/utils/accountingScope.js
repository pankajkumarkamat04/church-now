function resolveChurchId(req, { allowQuery = false } = {}) {
  const userChurch = req.user?.church?._id || req.user?.church;
  if (req.user?.role === 'ADMIN') {
    return userChurch ? String(userChurch) : null;
  }
  if (allowQuery && ['SUPERADMIN', 'CHURCH_ADMIN'].includes(String(req.user?.role || ''))) {
    const fromQuery = String(req.query?.churchId || req.body?.churchId || '').trim();
    return fromQuery || (userChurch ? String(userChurch) : null);
  }
  return userChurch ? String(userChurch) : null;
}

function periodFromDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  let period = 'Annual';
  if (month >= 0 && month <= 2) period = 'Q1';
  else if (month >= 3 && month <= 5) period = 'Q2';
  else if (month >= 6 && month <= 8) period = 'Q3';
  else if (month >= 9 && month <= 11) period = 'Q4';
  return { year, period };
}

module.exports = {
  resolveChurchId,
  periodFromDate,
};

const TithePayment = require('../models/TithePayment');
const Donation = require('../models/Donation');
const UserSubscription = require('../models/UserSubscription');
const Expense = require('../models/Expense');

const MAX_TRANSACTION_ROWS = 3500;

function mapTitheRow(t, churchLabel) {
  const uid = t.user && (t.user._id || t.user);
  const payWay =
    t.createdBy && String(t.createdBy) !== String(uid) ? 'Office / admin entry' : 'Member portal';
  return {
    id: `tithe-${t._id}`,
    kind: 'TITHE',
    paymentType: 'Tithe',
    paymentWay: payWay,
    amount: Number(t.amount || 0),
    currency: String(t.currency || 'USD').toUpperCase(),
    date: t.paidAt ? new Date(t.paidAt).toISOString() : null,
    party: (t.user && t.user.fullName) || (t.user && t.user.email) || '—',
    description: (t.note && String(t.note).trim()) || `Tithe — ${t.monthKey}`,
    status: '—',
    reference: String(t._id),
    churchId: t.church ? String(t.church) : null,
    churchName: churchLabel || null,
  };
}

function mapDonationRow(d, churchLabel) {
  return {
    id: `donation-${d._id}`,
    kind: 'DONATION',
    paymentType: 'Donation',
    paymentWay: d.source === 'MEMBER' ? 'Member portal' : 'Public / guest',
    amount: Number(d.amount || 0),
    currency: String(d.currency || 'USD').toUpperCase(),
    date: d.donatedAt ? new Date(d.donatedAt).toISOString() : null,
    party: (d.user && d.user.fullName) || (d.user && d.user.email) || d.donorName || d.donorEmail || '—',
    description: (d.note && String(d.note).trim()) || (d.source ? `Source: ${d.source}` : 'Donation'),
    status: d.source || '—',
    reference: String(d._id),
    churchId: d.church ? String(d.church) : null,
    churchName: churchLabel || (d.church && d.church.name) || null,
  };
}

function mapSubscriptionRow(s, churchLabel) {
  return {
    id: `subscription-${s._id}`,
    kind: 'SUBSCRIPTION',
    paymentType: 'Subscription',
    paymentWay: 'Recurring (member plan)',
    amount: Number(s.monthlyPrice || 0),
    currency: String(s.currency || 'USD').toUpperCase(),
    date: s.startDate ? new Date(s.startDate).toISOString() : null,
    party: (s.user && s.user.fullName) || (s.user && s.user.email) || '—',
    description: `Subscription${s.status ? ` — ${s.status}` : ''}`,
    status: s.status || '—',
    reference: String(s._id),
    churchId: s.church ? String(s.church) : null,
    churchName: churchLabel || (s.church && s.church.name) || null,
  };
}

function mapExpenseRow(e, churchLabel) {
  return {
    id: `expense-${e._id}`,
    kind: 'EXPENSE',
    paymentType: 'Expense',
    paymentWay: e.category ? String(e.category) : 'General',
    amount: Number(e.amount || 0),
    currency: String(e.currency || 'USD').toUpperCase(),
    date: e.expenseDate ? new Date(e.expenseDate).toISOString() : null,
    party: e.title || 'Church',
    description: e.description ? String(e.description).slice(0, 200) : e.title,
    status: e.category || '—',
    reference: String(e._id),
    churchId: e.church ? String(e.church) : null,
    churchName: churchLabel || (e.church && e.church.name) || null,
  };
}

function filterKinds(rows, kindsParam) {
  if (!kindsParam || !String(kindsParam).trim()) return rows;
  const set = new Set(
    String(kindsParam)
      .split(',')
      .map((k) => k.trim().toUpperCase())
      .filter(Boolean)
  );
  if (set.size === 0) return rows;
  return rows.filter((r) => set.has(r.kind));
}

async function buildTransactionRowsForChurch(churchId, fromStr, toStr, kindsParam) {
  const titheQ = { church: churchId, ...buildDateRange('paidAt', fromStr, toStr) };
  const donQ = { church: churchId, ...buildDateRange('donatedAt', fromStr, toStr) };
  const subQ = { church: churchId, ...buildDateRange('startDate', fromStr, toStr) };
  const expQ = { church: churchId, ...buildDateRange('expenseDate', fromStr, toStr) };

  const [tithes, donations, subs, exps] = await Promise.all([
    TithePayment.find(titheQ)
      .populate('user', 'fullName email')
      .select('amount currency paidAt monthKey note user church createdBy')
      .lean(),
    Donation.find(donQ)
      .populate('user', 'fullName email')
      .select('amount currency donatedAt note user church donorName donorEmail source')
      .lean(),
    UserSubscription.find(subQ)
      .populate('user', 'fullName email')
      .select('monthlyPrice currency startDate status user church')
      .lean(),
    Expense.find(expQ).select('title amount currency expenseDate category description church').lean(),
  ]);

  const rows = [];
  for (const t of tithes) rows.push(mapTitheRow(t, null));
  for (const d of donations) rows.push(mapDonationRow(d, null));
  for (const s of subs) rows.push(mapSubscriptionRow(s, null));
  for (const e of exps) rows.push(mapExpenseRow(e, null));

  rows.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });

  const filtered = filterKinds(rows, kindsParam);
  const total = filtered.length;
  const truncated = total > MAX_TRANSACTION_ROWS;
  const out = truncated ? filtered.slice(0, MAX_TRANSACTION_ROWS) : filtered;
  return { transactions: out, transactionMeta: { total, returned: out.length, truncated } };
}

async function buildTransactionRowsAllChurches(fromStr, toStr, kindsParam) {
  const titheQ = { ...buildDateRange('paidAt', fromStr, toStr) };
  const donQ = { ...buildDateRange('donatedAt', fromStr, toStr) };
  const subQ = { ...buildDateRange('startDate', fromStr, toStr) };
  const expQ = { ...buildDateRange('expenseDate', fromStr, toStr) };

  const [tithes, donations, subs, exps] = await Promise.all([
    TithePayment.find(titheQ)
      .populate('user', 'fullName email')
      .populate('church', 'name')
      .select('amount currency paidAt monthKey note user church createdBy')
      .lean(),
    Donation.find(donQ)
      .populate('user', 'fullName email')
      .populate('church', 'name')
      .select('amount currency donatedAt note user church donorName donorEmail source')
      .lean(),
    UserSubscription.find(subQ)
      .populate('user', 'fullName email')
      .populate('church', 'name')
      .select('monthlyPrice currency startDate status user church')
      .lean(),
    Expense.find(expQ).populate('church', 'name').select('title amount currency expenseDate category description church').lean(),
  ]);

  const rows = [];
  for (const t of tithes) {
    const name = t.church && t.church.name;
    rows.push(mapTitheRow(t, name));
  }
  for (const d of donations) {
    const name = d.church && d.church.name;
    rows.push(mapDonationRow(d, name));
  }
  for (const s of subs) {
    const name = s.church && s.church.name;
    rows.push(mapSubscriptionRow(s, name));
  }
  for (const e of exps) {
    const name = e.church && e.church.name;
    rows.push(mapExpenseRow(e, name));
  }

  rows.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });

  const filtered = filterKinds(rows, kindsParam);
  const total = filtered.length;
  const truncated = total > MAX_TRANSACTION_ROWS;
  const out = truncated ? filtered.slice(0, MAX_TRANSACTION_ROWS) : filtered;
  return { transactions: out, transactionMeta: { total, returned: out.length, truncated } };
}

function churchId(req) {
  return req.user?.church;
}

function buildDateRange(field, fromStr, toStr) {
  if (!fromStr && !toStr) return {};
  const range = {};
  if (fromStr) range.$gte = new Date(fromStr);
  if (toStr) {
    const t = new Date(toStr);
    t.setHours(23, 59, 59, 999);
    range.$lte = t;
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

function ensureCurrency(buckets, currency) {
  const c = (currency || 'USD').toUpperCase();
  if (!buckets[c]) {
    buckets[c] = {
      tithes: 0,
      donations: 0,
      subscriptions: 0,
      expenses: 0,
    };
  }
  return c;
}

function addTotals(buckets) {
  const byCurrency = {};
  for (const [cur, v] of Object.entries(buckets)) {
    const income = v.tithes + v.donations + v.subscriptions;
    const net = income - v.expenses;
    byCurrency[cur] = {
      ...v,
      incomeTotal: income,
      net,
    };
  }
  return byCurrency;
}

async function aggregateForChurch(churchId, fromStr, toStr) {
  const titheQ = { church: churchId, ...buildDateRange('paidAt', fromStr, toStr) };
  const donQ = { church: churchId, ...buildDateRange('donatedAt', fromStr, toStr) };
  const subQ = { church: churchId, ...buildDateRange('startDate', fromStr, toStr) };
  const expQ = { church: churchId, ...buildDateRange('expenseDate', fromStr, toStr) };

  const [tithes, donations, subs, exps, titheC, donC, subC, expC] = await Promise.all([
    TithePayment.find(titheQ).select('amount currency'),
    Donation.find(donQ).select('amount currency'),
    UserSubscription.find(subQ).select('monthlyPrice currency'),
    Expense.find(expQ).select('amount currency'),
    TithePayment.countDocuments(titheQ),
    Donation.countDocuments(donQ),
    UserSubscription.countDocuments(subQ),
    Expense.countDocuments(expQ),
  ]);

  const buckets = {};
  for (const t of tithes) {
    const c = ensureCurrency(buckets, t.currency);
    buckets[c].tithes += Number(t.amount || 0);
  }
  for (const d of donations) {
    const c = ensureCurrency(buckets, d.currency);
    buckets[c].donations += Number(d.amount || 0);
  }
  for (const s of subs) {
    const c = ensureCurrency(buckets, s.currency);
    buckets[c].subscriptions += Number(s.monthlyPrice || 0);
  }
  for (const e of exps) {
    const c = ensureCurrency(buckets, e.currency);
    buckets[c].expenses += Number(e.amount || 0);
  }

  return {
    byCurrency: addTotals(buckets),
    counts: {
      tithes: titheC,
      donations: donC,
      subscriptions: subC,
      expenses: expC,
    },
  };
}

async function getAdminFinanceSummary(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { from, to, kinds } = req.query;
  const [data, tx] = await Promise.all([
    aggregateForChurch(cid, from, to),
    buildTransactionRowsForChurch(cid, from, to, kinds),
  ]);
  return res.json({
    churchId: String(cid),
    from: from || null,
    to: to || null,
    ...data,
    ...tx,
  });
}

async function getSuperadminFinanceSummary(req, res) {
  const { churchId, from, to, kinds } = req.query;
  if (churchId) {
    const id = String(churchId).trim();
    const [data, tx] = await Promise.all([
      aggregateForChurch(id, from, to),
      buildTransactionRowsForChurch(id, from, to, kinds),
    ]);
    return res.json({
      churchId: id,
      from: from || null,
      to: to || null,
      ...data,
      ...tx,
    });
  }

  const titheQ = { ...buildDateRange('paidAt', from, to) };
  const donQ = { ...buildDateRange('donatedAt', from, to) };
  const subQ = { ...buildDateRange('startDate', from, to) };
  const expQ = { ...buildDateRange('expenseDate', from, to) };

  const [
    tithes,
    donations,
    subs,
    exps,
    titheC,
    donC,
    subC,
    expC,
    tx,
  ] = await Promise.all([
    TithePayment.find(titheQ).select('amount currency'),
    Donation.find(donQ).select('amount currency'),
    UserSubscription.find(subQ).select('monthlyPrice currency'),
    Expense.find(expQ).select('amount currency'),
    TithePayment.countDocuments(titheQ),
    Donation.countDocuments(donQ),
    UserSubscription.countDocuments(subQ),
    Expense.countDocuments(expQ),
    buildTransactionRowsAllChurches(from, to, kinds),
  ]);

  const buckets = {};
  for (const t of tithes) {
    const c = ensureCurrency(buckets, t.currency);
    buckets[c].tithes += Number(t.amount || 0);
  }
  for (const d of donations) {
    const c = ensureCurrency(buckets, d.currency);
    buckets[c].donations += Number(d.amount || 0);
  }
  for (const s of subs) {
    const c = ensureCurrency(buckets, s.currency);
    buckets[c].subscriptions += Number(s.monthlyPrice || 0);
  }
  for (const e of exps) {
    const c = ensureCurrency(buckets, e.currency);
    buckets[c].expenses += Number(e.amount || 0);
  }

  return res.json({
    churchId: null,
    from: from || null,
    to: to || null,
    byCurrency: addTotals(buckets),
    counts: {
      tithes: titheC,
      donations: donC,
      subscriptions: subC,
      expenses: expC,
    },
    ...tx,
  });
}

module.exports = {
  getAdminFinanceSummary,
  getSuperadminFinanceSummary,
};

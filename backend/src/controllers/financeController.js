const { Payment } = require('../models/Payment');
const Expense = require('../models/Expense');

const MAX_TRANSACTION_ROWS = 3500;
const postedExpenseFilter = { $or: [{ approvalStage: 'POSTED' }, { approvalStatus: 'APPROVED' }] };

function mapPaymentRow(p, churchLabel) {
  const breakdown = Array.isArray(p.paymentLines)
    ? p.paymentLines
        .map((line) => [line.paymentType, line.amount])
        .filter(([, v]) => Number(v) > 0)
    : [];
  const option = breakdown.length === 1 ? String(breakdown[0][0] || 'PAYMENT').toUpperCase() : 'PAYMENT';
  const type = breakdown.length > 1 ? 'Combined payment' : option.charAt(0) + option.slice(1).toLowerCase();
  const breakdownText =
    breakdown.length > 0
      ? breakdown.map(([k, v]) => `${k}:${Number(v).toFixed(2)}`).join(', ')
      : '';
  return {
    id: `payment-${p._id}`,
    kind: 'PAYMENT',
    paymentType: type,
    paymentWay: p.source || '—',
    amount: Number(p.amount || 0),
    currency: 'USD',
    displayCurrency: String(p.displayCurrency || 'USD').toUpperCase(),
    fxUsdPerUnit: p.fxUsdPerUnit != null ? Number(p.fxUsdPerUnit) : null,
    amountDisplayTotal: p.amountDisplayTotal != null ? Number(p.amountDisplayTotal) : null,
    date: p.paidAt ? new Date(p.paidAt).toISOString() : null,
    party: (p.user && p.user.fullName) || (p.user && p.user.email) || p.donorName || p.donorEmail || '—',
    description: (p.note && String(p.note).trim()) || breakdownText || `${type} payment`,
    status: breakdown.length > 1 ? 'COMBINED' : option,
    reference: String(p._id),
    churchId: p.church ? String(p.church) : null,
    churchName: churchLabel || (p.church && p.church.name) || null,
  };
}

function mapExpenseRow(e, churchLabel) {
  return {
    id: `expense-${e._id}`,
    kind: 'EXPENSE',
    paymentType: 'Expense',
    paymentWay: e.category ? String(e.category) : 'General',
    amount: Number(e.amount || 0),
    currency: 'USD',
    displayCurrency: String(e.displayCurrency || 'USD').toUpperCase(),
    fxUsdPerUnit: e.fxUsdPerUnit != null ? Number(e.fxUsdPerUnit) : null,
    amountDisplayTotal: e.amountDisplayTotal != null ? Number(e.amountDisplayTotal) : null,
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
  const payQ = { church: churchId, ...buildDateRange('paidAt', fromStr, toStr) };
  const expQ = { church: churchId, ...postedExpenseFilter, ...buildDateRange('expenseDate', fromStr, toStr) };

  const [payments, exps] = await Promise.all([
    Payment.find(payQ)
      .populate('user', 'fullName email')
      .select(
        'amount currency displayCurrency fxUsdPerUnit amountDisplayTotal paidAt paymentLines note user church source donorName donorEmail'
      )
      .lean(),
    Expense.find(expQ)
      .select(
        'title amount currency displayCurrency fxUsdPerUnit amountDisplayTotal expenseDate category description church'
      )
      .lean(),
  ]);

  const rows = [];
  for (const p of payments) rows.push(mapPaymentRow(p, null));
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
  const payQ = { ...buildDateRange('paidAt', fromStr, toStr) };
  const expQ = { ...postedExpenseFilter, ...buildDateRange('expenseDate', fromStr, toStr) };

  const [payments, exps] = await Promise.all([
    Payment.find(payQ)
      .populate('user', 'fullName email')
      .populate('church', 'name')
      .select(
        'amount currency displayCurrency fxUsdPerUnit amountDisplayTotal paidAt paymentLines note user church source donorName donorEmail'
      )
      .lean(),
    Expense.find(expQ)
      .populate('church', 'name')
      .select(
        'title amount currency displayCurrency fxUsdPerUnit amountDisplayTotal expenseDate category description church'
      )
      .lean(),
  ]);

  const rows = [];
  for (const p of payments) {
    const name = p.church && p.church.name;
    rows.push(mapPaymentRow(p, name));
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

function ensureUsdBucket(buckets) {
  if (!buckets.USD) {
    buckets.USD = {
      payments: 0,
      expenses: 0,
    };
  }
}

function addTotals(buckets) {
  const byCurrency = {};
  for (const [cur, v] of Object.entries(buckets)) {
    const income = v.payments;
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
  const payQ = { church: churchId, ...buildDateRange('paidAt', fromStr, toStr) };
  const expQ = { church: churchId, ...postedExpenseFilter, ...buildDateRange('expenseDate', fromStr, toStr) };

  const [payments, exps, payC, expC] = await Promise.all([
    Payment.find(payQ).select('amount'),
    Expense.find(expQ).select('amount'),
    Payment.countDocuments(payQ),
    Expense.countDocuments(expQ),
  ]);

  const buckets = {};
  for (const p of payments) {
    ensureUsdBucket(buckets);
    buckets.USD.payments += Number(p.amount || 0);
  }
  for (const e of exps) {
    ensureUsdBucket(buckets);
    buckets.USD.expenses += Number(e.amount || 0);
  }

  return {
    byCurrency: addTotals(buckets),
    counts: {
      payments: payC,
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

  const payQ = { ...buildDateRange('paidAt', from, to) };
  const expQ = { ...postedExpenseFilter, ...buildDateRange('expenseDate', from, to) };

  const [
    payments,
    exps,
    payC,
    expC,
    tx,
  ] = await Promise.all([
    Payment.find(payQ).select('amount'),
    Expense.find(expQ).select('amount'),
    Payment.countDocuments(payQ),
    Expense.countDocuments(expQ),
    buildTransactionRowsAllChurches(from, to, kinds),
  ]);

  const buckets = {};
  for (const p of payments) {
    ensureUsdBucket(buckets);
    buckets.USD.payments += Number(p.amount || 0);
  }
  for (const e of exps) {
    ensureUsdBucket(buckets);
    buckets.USD.expenses += Number(e.amount || 0);
  }

  return res.json({
    churchId: null,
    from: from || null,
    to: to || null,
    byCurrency: addTotals(buckets),
    counts: {
      payments: payC,
      expenses: expC,
    },
    ...tx,
  });
}

module.exports = {
  getAdminFinanceSummary,
  getSuperadminFinanceSummary,
};

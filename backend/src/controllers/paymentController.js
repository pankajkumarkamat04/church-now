const { Payment, PAYMENT_OPTIONS } = require('../models/Payment');

function churchId(req) {
  return req.user?.church;
}

function normalizeOption(option) {
  return String(option || '')
    .trim()
    .toUpperCase();
}

function validatePayload({ amount, paymentType, paymentOption }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 'Valid amount is required';
  }
  const normalizedOption = normalizeOption(paymentType || paymentOption);
  if (!PAYMENT_OPTIONS.includes(normalizedOption)) {
    return `paymentType must be one of: ${PAYMENT_OPTIONS.join(', ')}`;
  }
  return null;
}

function normalizeAmountsByOption(input) {
  const result = {};
  for (const option of PAYMENT_OPTIONS) {
    const raw = input && Object.prototype.hasOwnProperty.call(input, option) ? input[option] : 0;
    const numeric = Number(raw);
    result[option] = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }
  return result;
}

async function listMemberPayments(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await Payment.find({ church: cid, user: req.user._id }).sort({ paidAt: -1, createdAt: -1 });
  return res.json(rows);
}

async function payMember(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const payload = req.body || {};
  const amountsByOption = normalizeAmountsByOption(payload.amountsByOption);
  const entries = Object.entries(amountsByOption).filter(([, amount]) => amount > 0);

  if (entries.length === 0) {
    const err = validatePayload(payload);
    if (err) return res.status(400).json({ message: 'Enter at least one payment amount' });
    entries.push([normalizeOption(payload.paymentType || payload.paymentOption), Number(payload.amount)]);
  }

  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const currency = String(payload.currency || 'USD').toUpperCase();
  const note = String(payload.note || '').trim();
  const paymentLines = entries.map(([paymentType, amount]) => ({
    paymentType,
    amount: Number(amount),
  }));
  const totalAmount = entries.reduce((sum, [, amount]) => sum + Number(amount), 0);
  const row = await Payment.create({
    church: cid,
    user: req.user._id,
    paymentLines,
    amount: totalAmount,
    currency,
    note,
    paidAt,
    source: 'MEMBER',
    createdBy: req.user._id,
  });
  return res.status(201).json(row);
}

async function listAdminPayments(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await Payment.find({ church: cid })
    .populate('user', 'fullName email')
    .sort({ paidAt: -1, createdAt: -1 });
  return res.json(rows);
}

async function listSuperadminPayments(_req, res) {
  const rows = await Payment.find({})
    .populate('church', 'name')
    .populate('user', 'fullName email')
    .sort({ paidAt: -1, createdAt: -1 });
  return res.json(rows);
}

module.exports = {
  PAYMENT_OPTIONS,
  listMemberPayments,
  payMember,
  listAdminPayments,
  listSuperadminPayments,
};

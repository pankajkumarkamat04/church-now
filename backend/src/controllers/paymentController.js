const { Payment, PAYMENT_OPTIONS } = require('../models/Payment');
const MemberBalanceDeposit = require('../models/MemberBalanceDeposit');
const User = require('../models/User');

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

async function getMemberPaymentBalance(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const member = await User.findOne({ _id: req.user._id, church: cid }).select('walletBalance');
  if (!member) return res.status(404).json({ message: 'Member not found' });
  return res.json({ balance: Number(member.walletBalance || 0) });
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
  const updatedMember = await User.findOneAndUpdate(
    {
      _id: req.user._id,
      church: cid,
      walletBalance: { $gte: totalAmount },
    },
    { $inc: { walletBalance: -totalAmount } },
    { new: true }
  ).select('walletBalance');
  if (!updatedMember) {
    return res.status(400).json({ message: 'Insufficient balance. Ask treasurer to deposit funds first.' });
  }
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
  return res.status(201).json({
    ...row.toObject(),
    remainingBalance: Number(updatedMember.walletBalance || 0),
  });
}

async function listAdminPayments(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await Payment.find({ church: cid })
    .populate('user', 'fullName email')
    .sort({ paidAt: -1, createdAt: -1 });
  return res.json(rows);
}

async function listAdminMemberBalances(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await User.find({ church: cid, role: 'MEMBER' })
    .sort({ fullName: 1, email: 1 })
    .select('fullName email walletBalance');
  return res.json(
    rows.map((row) => ({
      _id: row._id,
      fullName: row.fullName || '',
      email: row.email || '',
      walletBalance: Number(row.walletBalance || 0),
    }))
  );
}

async function depositMemberBalance(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const memberId = String(req.body?.memberId || '').trim();
  const amount = Number(req.body?.amount);
  if (!memberId) return res.status(400).json({ message: 'memberId is required' });
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Valid deposit amount is required' });
  }
  const updated = await User.findOneAndUpdate(
    { _id: memberId, church: cid, role: 'MEMBER' },
    { $inc: { walletBalance: amount } },
    { new: true, runValidators: true }
  ).select('fullName email walletBalance');
  if (!updated) return res.status(404).json({ message: 'Member not found in your church' });
  const depositLog = await MemberBalanceDeposit.create({
    church: cid,
    member: updated._id,
    amount,
    depositedBy: req.user._id,
    depositedAt: new Date(),
  });
  return res.json({
    _id: updated._id,
    fullName: updated.fullName || '',
    email: updated.email || '',
    walletBalance: Number(updated.walletBalance || 0),
    depositId: depositLog._id,
  });
}

async function listAdminDepositHistory(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await MemberBalanceDeposit.find({ church: cid })
    .populate('member', 'fullName email')
    .populate('depositedBy', 'fullName email')
    .sort({ depositedAt: -1, createdAt: -1 })
    .limit(200);
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
  getMemberPaymentBalance,
  payMember,
  listAdminPayments,
  listAdminMemberBalances,
  depositMemberBalance,
  listAdminDepositHistory,
  listSuperadminPayments,
};

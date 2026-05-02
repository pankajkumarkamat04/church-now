const { Payment, PAYMENT_OPTIONS } = require('../models/Payment');
const MemberBalanceDeposit = require('../models/MemberBalanceDeposit');
const User = require('../models/User');
const { normalizeDisplayCurrency, convertDisplayAmountToUsd } = require('../utils/displayCurrency');

function churchId(req) {
  return req.user?.church;
}

/** Same people scope as congregation list: members + church-linked admins (treasurer, etc.). */
function churchPeopleFilter(churchId) {
  if (!churchId) return { _id: null };
  return {
    $or: [
      { church: churchId, role: 'MEMBER' },
      { role: 'ADMIN', $or: [{ church: churchId }, { adminChurches: churchId }] },
    ],
  };
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
  const display = normalizeDisplayCurrency(payload.displayCurrency ?? payload.currency);
  const note = String(payload.note || '').trim();
  const paymentLinesDisplay = entries.map(([paymentType, amount]) => ({
    paymentType,
    amount: Number(amount),
  }));
  const totalDisplay = paymentLinesDisplay.reduce((sum, line) => sum + line.amount, 0);
  let conv;
  try {
    conv = await convertDisplayAmountToUsd(display, totalDisplay);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ message: e.message || 'Currency conversion failed' });
  }
  const factor = totalDisplay > 0 ? conv.amountUsd / totalDisplay : 0;
  const paymentLines = paymentLinesDisplay.map((line) => ({
    paymentType: line.paymentType,
    amount: line.amount * factor,
  }));
  const totalAmount = conv.amountUsd;
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
    currency: 'USD',
    displayCurrency: conv.displayCurrency,
    fxUsdPerUnit: conv.fxUsdPerUnit,
    amountDisplayTotal: conv.amountDisplay,
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
    .populate('user', 'fullName email memberId memberRoleDisplay memberCategory role')
    .populate('createdBy', 'fullName email')
    .sort({ paidAt: -1, createdAt: -1 });
  return res.json(rows);
}

/** Treasurer allocates payment types from a recipient's wallet (same rules as member self-pay). */
async function payOnBehalf(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const payload = req.body || {};
  const targetUserId = String(payload.memberId || payload.userId || '').trim();
  if (!targetUserId) {
    return res.status(400).json({ message: 'memberId is required' });
  }

  const recipientOk = await User.findOne({
    _id: targetUserId,
    ...churchPeopleFilter(cid),
  }).select('_id');
  if (!recipientOk) {
    return res.status(404).json({ message: 'Recipient not found in your church' });
  }

  const amountsByOption = normalizeAmountsByOption(payload.amountsByOption);
  const entries = Object.entries(amountsByOption).filter(([, amount]) => amount > 0);

  if (entries.length === 0) {
    const err = validatePayload(payload);
    if (err) return res.status(400).json({ message: 'Enter at least one payment amount' });
    entries.push([normalizeOption(payload.paymentType || payload.paymentOption), Number(payload.amount)]);
  }

  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const display = normalizeDisplayCurrency(payload.displayCurrency ?? payload.currency);
  const note = String(payload.note || '').trim();
  const paymentLinesDisplay = entries.map(([paymentType, amount]) => ({
    paymentType,
    amount: Number(amount),
  }));
  const totalDisplay = paymentLinesDisplay.reduce((sum, line) => sum + line.amount, 0);
  let conv;
  try {
    conv = await convertDisplayAmountToUsd(display, totalDisplay);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ message: e.message || 'Currency conversion failed' });
  }
  const factor = totalDisplay > 0 ? conv.amountUsd / totalDisplay : 0;
  const paymentLines = paymentLinesDisplay.map((line) => ({
    paymentType: line.paymentType,
    amount: line.amount * factor,
  }));
  const totalAmount = conv.amountUsd;

  const updatedMember = await User.findOneAndUpdate(
    {
      _id: targetUserId,
      ...churchPeopleFilter(cid),
      walletBalance: { $gte: totalAmount },
    },
    { $inc: { walletBalance: -totalAmount } },
    { new: true }
  ).select('walletBalance');
  if (!updatedMember) {
    return res.status(400).json({
      message: 'Insufficient balance for this account. Deposit funds first.',
    });
  }

  const row = await Payment.create({
    church: cid,
    user: targetUserId,
    paymentLines,
    amount: totalAmount,
    currency: 'USD',
    displayCurrency: conv.displayCurrency,
    fxUsdPerUnit: conv.fxUsdPerUnit,
    amountDisplayTotal: conv.amountDisplay,
    note,
    paidAt,
    source: 'ADMIN',
    createdBy: req.user._id,
  });

  return res.status(201).json({
    ...row.toObject(),
    remainingBalance: Number(updatedMember.walletBalance || 0),
  });
}

async function listAdminMemberBalances(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await User.find(churchPeopleFilter(cid))
    .sort({ fullName: 1, email: 1 })
    .select('fullName email walletBalance memberId memberRoleDisplay memberCategory role');
  return res.json(
    rows.map((row) => ({
      _id: row._id,
      fullName: row.fullName || '',
      email: row.email || '',
      walletBalance: Number(row.walletBalance || 0),
      memberId: row.memberId || '',
      memberRoleDisplay: row.memberRoleDisplay || '',
      memberCategory: row.memberCategory || '',
      role: row.role || 'MEMBER',
    }))
  );
}

async function depositMemberBalance(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const memberId = String(req.body?.memberId || '').trim();
  const amountRaw = Number(req.body?.amount);
  if (!memberId) return res.status(400).json({ message: 'memberId is required' });
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return res.status(400).json({ message: 'Valid deposit amount is required' });
  }
  const display = normalizeDisplayCurrency(req.body?.displayCurrency ?? req.body?.currency);
  let conv;
  try {
    conv = await convertDisplayAmountToUsd(display, amountRaw);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ message: e.message || 'Currency conversion failed' });
  }
  const updated = await User.findOneAndUpdate(
    { _id: memberId, ...churchPeopleFilter(cid) },
    { $inc: { walletBalance: conv.amountUsd } },
    { new: true, runValidators: true }
  ).select('fullName email walletBalance');
  if (!updated) return res.status(404).json({ message: 'Person not found in your church' });
  const depositLog = await MemberBalanceDeposit.create({
    church: cid,
    member: updated._id,
    amount: conv.amountUsd,
    currency: 'USD',
    displayCurrency: conv.displayCurrency,
    fxUsdPerUnit: conv.fxUsdPerUnit,
    amountDisplay: conv.amountDisplay,
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

/** Treasurer view: payments + deposits for one congregation member (same scope as member list). */
async function listMemberStatementForAdmin(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const mid = String(req.params.memberId || '').trim();
  const memberDoc = await User.findOne({
    _id: mid,
    $or: [
      { church: cid, role: 'MEMBER' },
      { role: 'ADMIN', $or: [{ church: cid }, { adminChurches: cid }] },
    ],
  }).select('walletBalance fullName email role memberId');
  if (!memberDoc) {
    return res.status(404).json({ message: 'Member not found' });
  }
  const [payments, deposits] = await Promise.all([
    Payment.find({ church: cid, user: mid })
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(500)
      .lean(),
    MemberBalanceDeposit.find({ church: cid, member: mid })
      .populate('depositedBy', 'fullName email')
      .sort({ depositedAt: -1, createdAt: -1 })
      .limit(200)
      .lean(),
  ]);
  return res.json({
    walletBalance: Number(memberDoc.walletBalance || 0),
    payments,
    deposits,
  });
}

async function listAdminDepositHistory(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const rows = await MemberBalanceDeposit.find({ church: cid })
    .populate('member', 'fullName email memberId memberRoleDisplay memberCategory role')
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
  payOnBehalf,
  listAdminMemberBalances,
  depositMemberBalance,
  listAdminDepositHistory,
  listMemberStatementForAdmin,
  listSuperadminPayments,
};

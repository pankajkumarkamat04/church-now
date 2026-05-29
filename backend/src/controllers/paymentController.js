const { Payment, PAYMENT_OPTIONS } = require('../models/Payment');
const MemberBalanceDeposit = require('../models/MemberBalanceDeposit');
const User = require('../models/User');
const { ensureTreasurerAccess } = require('../utils/treasurerAccess');
const { getPaginationParams, paginatedResponse } = require('../utils/paginate');
const {
  loadChurchForDeletion,
  loadPendingDeletionsMap,
  serializeDeletionRequest,
} = require('../utils/transactionDeletion');
const {
  churchPeopleFilter,
  executeWalletDeposit,
  executeCongregationPayment,
} = require('../utils/churchPaymentFlow');

function churchId(req) {
  return req.user?.church;
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

  const result = await executeCongregationPayment({
    churchId: cid,
    targetUserId: String(req.user._id),
    payload: req.body || {},
    source: 'MEMBER',
    createdBy: req.user._id,
    paymentMethod: 'Wallet',
  });
  if (result.error) return res.status(result.statusCode || 400).json({ message: result.error });

  return res.status(201).json({
    ...result.payment.toObject(),
    remainingBalance: result.remainingBalance,
    receiptNumber: result.receiptNumber,
  });
}

async function listAdminPayments(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const { page, limit, skip } = getPaginationParams(req.query);
  const [churchForDeletion, pendingMap, total, rows] = await Promise.all([
    loadChurchForDeletion(cid),
    loadPendingDeletionsMap(cid),
    Payment.countDocuments({ church: cid }),
    Payment.find({ church: cid })
      .populate('user', 'fullName email memberId memberRoleDisplay memberCategory role')
      .populate('createdBy', 'fullName email')
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  const data = rows.map((row) => {
    const obj = row.toObject ? row.toObject() : row;
    const pending = pendingMap.get(`PAYMENT:${String(obj._id)}`);
    return {
      ...obj,
      pendingDeletion: pending
        ? serializeDeletionRequest(pending, churchForDeletion, req.user?._id)
        : null,
    };
  });
  return res.json(paginatedResponse(data, total, page, limit));
}

async function payOnBehalf(req, res) {
  if (!(await ensureTreasurerAccess(req, res))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const targetUserId = String(req.body?.memberId || req.body?.userId || '').trim();
  if (!targetUserId) return res.status(400).json({ message: 'memberId is required' });

  const result = await executeCongregationPayment({
    churchId: cid,
    targetUserId,
    payload: req.body || {},
    source: 'ADMIN',
    createdBy: req.user._id,
    paymentMethod: req.body?.paymentMethod || 'Wallet',
  });
  if (result.error) return res.status(result.statusCode || 400).json({ message: result.error });

  return res.status(201).json({
    ...result.payment.toObject(),
    remainingBalance: result.remainingBalance,
    receiptNumber: result.receiptNumber,
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
  if (!(await ensureTreasurerAccess(req, res))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const memberId = String(req.body?.memberId || '').trim();
  const amountRaw = Number(req.body?.amount);
  if (!memberId) return res.status(400).json({ message: 'memberId is required' });
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return res.status(400).json({ message: 'Valid deposit amount is required' });
  }

  const result = await executeWalletDeposit({
    churchId: cid,
    memberId,
    amountRaw,
    displayCurrency: req.body?.displayCurrency ?? req.body?.currency,
    paymentMethod: req.body?.paymentMethod || 'Cash',
    userId: req.user._id,
  });
  if (result.error) return res.status(result.statusCode || 400).json({ message: result.error });

  return res.json({
    _id: result.member._id,
    fullName: result.member.fullName || '',
    email: result.member.email || '',
    walletBalance: Number(result.member.walletBalance || 0),
    depositId: result.deposit._id,
    receiptNumber: result.receiptNumber,
  });
}

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
  const { page, limit, skip } = getPaginationParams(req.query);
  const [total, rows] = await Promise.all([
    MemberBalanceDeposit.countDocuments({ church: cid }),
    MemberBalanceDeposit.find({ church: cid })
      .populate('member', 'fullName email memberId memberRoleDisplay memberCategory role')
      .populate('depositedBy', 'fullName email')
      .sort({ depositedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  return res.json(paginatedResponse(rows, total, page, limit));
}

async function listSuperadminPayments(req, res) {
  const { page, limit, skip } = getPaginationParams(req.query);
  const [total, rows] = await Promise.all([
    Payment.countDocuments({}),
    Payment.find({})
      .populate('church', 'name')
      .populate('user', 'fullName email memberId memberRoleDisplay memberCategory role')
      .populate('createdBy', 'fullName email')
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  return res.json(paginatedResponse(rows, total, page, limit));
}

async function listSuperadminDepositHistory(req, res) {
  const { page, limit, skip } = getPaginationParams(req.query);
  const [total, rows] = await Promise.all([
    MemberBalanceDeposit.countDocuments({}),
    MemberBalanceDeposit.find({})
      .populate('church', 'name')
      .populate('member', 'fullName email memberId memberRoleDisplay memberCategory role')
      .populate('depositedBy', 'fullName email')
      .sort({ depositedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  return res.json(paginatedResponse(rows, total, page, limit));
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
  listSuperadminDepositHistory,
};

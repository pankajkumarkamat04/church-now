const User = require('../models/User');
const { Payment } = require('../models/Payment');
const MemberBalanceDeposit = require('../models/MemberBalanceDeposit');
const { resolveChurchId } = require('../utils/accountingScope');
const { ensureTreasurerAccess } = require('../utils/treasurerAccess');
const {
  churchPeopleFilter,
  executeWalletDeposit,
  executeCongregationPayment,
} = require('../utils/churchPaymentFlow');

function churchId(req) {
  return resolveChurchId(req, { allowQuery: req.user?.role !== 'ADMIN' });
}

async function listMembers(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const search = String(req.query.search || '').trim().toLowerCase();

  let rows = await User.find(churchPeopleFilter(cid))
    .sort({ fullName: 1, email: 1 })
    .select('fullName email walletBalance memberId memberRoleDisplay memberCategory role')
    .lean();

  if (search) {
    rows = rows.filter((row) => {
      const hay = [row.fullName, row.email, row.memberId, row.memberRoleDisplay, row.memberCategory]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return hay.includes(search);
    });
  }

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

async function getMemberFinancialSummary(req, res) {
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });
  const mid = String(req.params.memberId || '').trim();

  const member = await User.findOne({ _id: mid, ...churchPeopleFilter(cid) }).select(
    'fullName email walletBalance memberId memberRoleDisplay memberCategory role'
  );
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const [payments, deposits] = await Promise.all([
    Payment.find({ church: cid, user: mid }).sort({ paidAt: -1, createdAt: -1 }).limit(200).lean(),
    MemberBalanceDeposit.find({ church: cid, member: mid })
      .populate('depositedBy', 'fullName email')
      .sort({ depositedAt: -1, createdAt: -1 })
      .limit(200)
      .lean(),
  ]);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalDeposited = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return res.json({
    member: {
      _id: member._id,
      fullName: member.fullName || '',
      email: member.email || '',
      walletBalance: Number(member.walletBalance || 0),
      memberId: member.memberId || '',
      memberRoleDisplay: member.memberRoleDisplay || '',
      memberCategory: member.memberCategory || '',
      role: member.role || 'MEMBER',
    },
    summary: {
      totalDeposited,
      totalPaid,
      walletBalance: Number(member.walletBalance || 0),
      paymentCount: payments.length,
      depositCount: deposits.length,
    },
    payments,
    deposits,
  });
}

async function recordGlobalDeposit(req, res) {
  if (!(await ensureTreasurerAccess(req, res, churchId(req)))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const memberId = String(req.params.memberId || req.body?.memberId || '').trim();
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

  return res.status(201).json({
    member: {
      _id: result.member._id,
      fullName: result.member.fullName || '',
      email: result.member.email || '',
      walletBalance: Number(result.member.walletBalance || 0),
      memberId: result.member.memberId || '',
    },
    deposit: result.deposit,
    receiptNumber: result.receiptNumber,
    journalEntryId: result.journalEntry?._id || null,
  });
}

async function recordGlobalPayment(req, res) {
  if (!(await ensureTreasurerAccess(req, res, churchId(req)))) return;
  const cid = churchId(req);
  if (!cid) return res.status(400).json({ message: 'No church assigned' });

  const targetUserId = String(req.params.memberId || req.body?.memberId || '').trim();
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
    payment: result.payment,
    remainingBalance: result.remainingBalance,
    receiptNumber: result.receiptNumber,
    journalEntryId: result.journalEntry?._id || null,
  });
}

module.exports = {
  listMembers,
  getMemberFinancialSummary,
  recordGlobalDeposit,
  recordGlobalPayment,
};

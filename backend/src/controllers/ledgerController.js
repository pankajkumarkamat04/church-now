const LedgerAccount = require('../models/LedgerAccount');
const JournalEntry = require('../models/JournalEntry');
const { resolveChurchId } = require('../utils/accountingScope');
const { ensureTreasurerAccess } = require('../utils/treasurerAccess');

function churchRequired(req, res, allowQuery = false) {
  const cid = resolveChurchId(req, { allowQuery });
  if (!cid) {
    res.status(400).json({ message: 'Church context is required' });
    return null;
  }
  return cid;
}

async function getLedgerAccounts(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;
  const accounts = await LedgerAccount.find({ church: cid })
    .populate('parentAccount', 'accountName accountCode')
    .sort({ accountCode: 1 })
    .lean();

  const pendingAgg = await JournalEntry.aggregate([
    { $match: { church: cid, status: { $in: ['Draft', 'Pending Authorization'] } } },
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.account',
        pendingDebit: { $sum: '$lines.debit' },
        pendingCredit: { $sum: '$lines.credit' },
      },
    },
  ]);

  const pendingMap = {};
  pendingAgg.forEach((item) => {
    pendingMap[String(item._id)] = item;
  });

  const data = accounts.map((account) => {
    const pending = pendingMap[String(account._id)] || { pendingDebit: 0, pendingCredit: 0 };
    let pendingBalance = 0;
    if (account.normalBalance === 'Debit') {
      pendingBalance = pending.pendingDebit - pending.pendingCredit;
    } else {
      pendingBalance = pending.pendingCredit - pending.pendingDebit;
    }
    return { ...account, pendingBalance };
  });

  return res.json(data);
}

async function getLedgerAccountById(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;
  const account = await LedgerAccount.findOne({ _id: req.params.accountId, church: cid }).populate(
    'parentAccount',
    'accountName accountCode'
  );
  if (!account) return res.status(404).json({ message: 'Ledger account not found' });
  return res.json(account);
}

async function createLedgerAccount(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const {
    accountCode,
    accountName,
    accountType,
    accountCategory,
    parentAccount,
    openingBalance,
    normalBalance,
    description,
    bankName,
    accountNumber,
  } = req.body || {};

  if (!accountCode || !accountName || !accountType) {
    return res.status(400).json({ message: 'accountCode, accountName, and accountType are required' });
  }

  const exists = await LedgerAccount.findOne({ church: cid, accountCode: String(accountCode).trim() });
  if (exists) return res.status(400).json({ message: 'Account code already exists for this church' });

  const opening = Number(openingBalance || 0);
  const account = await LedgerAccount.create({
    church: cid,
    accountCode: String(accountCode).trim(),
    accountName: String(accountName).trim(),
    accountType,
    accountCategory: accountCategory || accountType,
    parentAccount: parentAccount || null,
    openingBalance: opening,
    balance: opening,
    normalBalance: normalBalance || (['Asset', 'Expense'].includes(accountType) ? 'Debit' : 'Credit'),
    description: description || '',
    bankName: bankName || '',
    accountNumber: accountNumber || '',
    createdBy: req.user._id,
  });

  return res.status(201).json(account);
}

async function updateLedgerAccount(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const account = await LedgerAccount.findOne({ _id: req.params.accountId, church: cid });
  if (!account) return res.status(404).json({ message: 'Ledger account not found' });
  if (account.isSystemAccount) {
    return res.status(400).json({ message: 'System accounts cannot be modified except description and status' });
  }

  const { accountName, accountCategory, isActive, description, bankName, accountNumber } = req.body || {};
  if (accountName) account.accountName = String(accountName).trim();
  if (accountCategory) account.accountCategory = String(accountCategory).trim();
  if (typeof isActive === 'boolean') account.isActive = isActive;
  if (description !== undefined) account.description = String(description);
  if (bankName !== undefined) account.bankName = String(bankName);
  if (accountNumber !== undefined) account.accountNumber = String(accountNumber);

  await account.save();
  return res.json(account);
}

async function getJournalEntries(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;
  const status = String(req.query.status || '').trim();
  const filter = { church: cid };
  if (status) filter.status = status;
  const entries = await JournalEntry.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('verifiedBy', 'fullName email')
    .sort({ entryDate: -1, createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 500, 2000));
  return res.json(entries);
}

async function getAccountTransactions(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;
  const account = await LedgerAccount.findOne({ _id: req.params.accountId, church: cid });
  if (!account) return res.status(404).json({ message: 'Ledger account not found' });

  const transactions = await JournalEntry.find({ church: cid, 'lines.account': account._id })
    .populate('createdBy', 'fullName email')
    .populate('verifiedBy', 'fullName email')
    .sort({ entryDate: -1, createdAt: -1 });

  return res.json(transactions);
}

async function verifyTransaction(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const transaction = await JournalEntry.findOne({ _id: req.params.entryId, church: cid });
  if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
  if (transaction.status === 'Posted') {
    return res.status(400).json({ message: 'Transaction is already posted' });
  }
  if (transaction.status === 'Rejected') {
    return res.status(400).json({ message: 'Rejected transactions cannot be verified' });
  }

  transaction.verified = true;
  transaction.verifiedBy = req.user._id;
  transaction.verifiedDate = new Date();
  await transaction.post();
  return res.json(transaction);
}

async function rejectTransaction(req, res) {
  if (req.user?.role === 'ADMIN' && !(await ensureTreasurerAccess(req, res, req.user.church))) return;
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const transaction = await JournalEntry.findOne({ _id: req.params.entryId, church: cid });
  if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
  if (transaction.status === 'Posted') {
    return res.status(400).json({ message: 'Cannot reject a posted transaction' });
  }

  transaction.status = 'Rejected';
  transaction.rejectionReason = String(req.body?.reason || '').trim();
  transaction.rejectedBy = req.user._id;
  transaction.rejectedDate = new Date();
  transaction.verified = false;
  await transaction.save();
  return res.json(transaction);
}

async function getCashBookSummary(req, res) {
  const cid = churchRequired(req, res, req.user?.role !== 'ADMIN');
  if (!cid) return;

  const accounts = await LedgerAccount.find({
    church: cid,
    accountCode: { $in: ['1000', '1100'] },
  }).lean();

  const cashInHand = accounts.find((a) => a.accountCode === '1000')?.balance || 0;
  const cashAtBank = accounts.find((a) => a.accountCode === '1100')?.balance || 0;

  return res.json({
    cashInHand,
    cashAtBank,
    total: cashInHand + cashAtBank,
  });
}

module.exports = {
  getLedgerAccounts,
  getLedgerAccountById,
  createLedgerAccount,
  updateLedgerAccount,
  getJournalEntries,
  getAccountTransactions,
  verifyTransaction,
  rejectTransaction,
  getCashBookSummary,
};

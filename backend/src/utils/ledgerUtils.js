const LedgerAccount = require('../models/LedgerAccount');
const JournalEntry = require('../models/JournalEntry');
const { periodFromDate } = require('./accountingScope');

const PAYMENT_TYPE_INCOME_CODES = {
  TITHE: '4000',
  BUILDING: '4010',
  ROOF: '4020',
  GAZALAND: '4030',
  UTC: '4040',
  THANKS: '4050',
  MUSIC: '4060',
  XMAS: '4070',
  HARVEST: '4080',
};

const CHURCH_BASE_ACCOUNTS = [
  { accountCode: '1000', accountName: 'Cash in Hand', accountType: 'Asset', accountCategory: 'Current Assets', normalBalance: 'Debit' },
  { accountCode: '1100', accountName: 'Cash at Bank', accountType: 'Asset', accountCategory: 'Current Assets', normalBalance: 'Debit' },
  { accountCode: '1200', accountName: 'Accounts Receivable', accountType: 'Asset', accountCategory: 'Current Assets', normalBalance: 'Debit' },
  { accountCode: '2100', accountName: 'Member Wallet Liability', accountType: 'Liability', accountCategory: 'Current Liabilities', normalBalance: 'Credit' },
  { accountCode: '2200', accountName: 'Remittances Payable', accountType: 'Liability', accountCategory: 'Current Liabilities', normalBalance: 'Credit' },
  { accountCode: '3000', accountName: 'Church Fund Equity', accountType: 'Equity', accountCategory: 'Capital', normalBalance: 'Credit' },
  { accountCode: '3100', accountName: 'Retained Earnings', accountType: 'Equity', accountCategory: 'Capital', normalBalance: 'Credit' },
  { accountCode: '4000', accountName: 'Tithes Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4010', accountName: 'Building Fund Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4020', accountName: 'Roof Fund Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4030', accountName: 'Gazaland Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4040', accountName: 'UTC Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4050', accountName: 'Thanksgiving Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4060', accountName: 'Music Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4070', accountName: 'Christmas Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4080', accountName: 'Harvest Income', accountType: 'Income', accountCategory: 'Offerings', normalBalance: 'Credit' },
  { accountCode: '4200', accountName: 'Other Offerings Income', accountType: 'Income', accountCategory: 'Other Income', normalBalance: 'Credit' },
  { accountCode: '5000', accountName: 'Salaries Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5100', accountName: 'Utilities Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5200', accountName: 'General Maintenance', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5300', accountName: 'Supplies Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5400', accountName: 'Transport Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5500', accountName: 'Food & Catering Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5600', accountName: 'Events Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5700', accountName: 'Conference & Training', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5800', accountName: 'Insurance Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5900', accountName: 'Taxes & Licenses', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5910', accountName: 'Bank Charges', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '5950', accountName: 'Remittances Expense', accountType: 'Expense', accountCategory: 'Operating Expenses', normalBalance: 'Debit' },
  { accountCode: '1500', accountName: 'Property & Buildings', accountType: 'Asset', accountCategory: 'Fixed Assets', normalBalance: 'Debit' },
  { accountCode: '1510', accountName: 'Equipment & Vehicles', accountType: 'Asset', accountCategory: 'Fixed Assets', normalBalance: 'Debit' },
];

async function ensureBaseAccounts(churchId, userId) {
  for (const acc of CHURCH_BASE_ACCOUNTS) {
    const exists = await LedgerAccount.findOne({ church: churchId, accountCode: acc.accountCode });
    if (!exists) {
      await LedgerAccount.create({
        ...acc,
        church: churchId,
        isSystemAccount: true,
        createdBy: userId,
      });
    }
  }
}

function getAccountCodeForPaymentType(paymentType) {
  const code = String(paymentType || '').trim().toUpperCase();
  return PAYMENT_TYPE_INCOME_CODES[code] || '4200';
}

function getAccountCodeForCategory(category) {
  if (!category) return '5200';
  const cat = String(category).toLowerCase();
  if (cat === 'salaries' || cat.includes('salary') || cat.includes('wages') || cat.includes('staff')) return '5000';
  if (cat === 'rates' || cat.includes('util') || cat.includes('electricity') || cat.includes('water') || cat.includes('internet')) return '5100';
  if (cat === 'building' || cat.includes('maint') || cat.includes('repair') || cat.includes('project')) return '5200';
  if (cat.includes('suppl') || cat.includes('material')) return '5300';
  if (cat.includes('transport') || cat.includes('fuel') || cat.includes('vehicle')) return '5400';
  if (cat.includes('food') || cat.includes('catering') || cat.includes('meal')) return '5500';
  if (cat === 'councils' || cat.includes('event') || cat.includes('activ') || cat.includes('council')) return '5600';
  if (cat.includes('train') || cat.includes('conference') || cat.includes('prof')) return '5700';
  if (cat.includes('insurance')) return '5800';
  if (cat.includes('tax') || cat.includes('license')) return '5900';
  if (cat.includes('bank')) return '5910';
  if (cat.includes('remit')) return '5950';
  if (cat === 'others' || cat === 'other') return '5200';
  if (cat.includes('property') || cat.includes('furniture')) return '1500';
  if (cat.includes('equipment') || cat.includes('asset') || cat.includes('motor')) return '1510';
  return '5200';
}

function resolveCashAccountCode(paymentMethod) {
  const method = String(paymentMethod || 'Cash').toLowerCase();
  if (
    method.includes('bank') ||
    method.includes('cheque') ||
    method.includes('transfer') ||
    method.includes('cbz') ||
    method.includes('nostro')
  ) {
    return '1100';
  }
  return '1000';
}

async function findExistingEntry(churchId, referenceModel, referenceId) {
  if (!referenceId) return null;
  return JournalEntry.findOne({
    church: churchId,
    referenceModel,
    referenceId,
    status: { $ne: 'Rejected' },
  });
}

async function loadAccount(churchId, accountCode) {
  return LedgerAccount.findOne({ church: churchId, accountCode, isActive: true });
}

async function buildLine(account, debit, credit, description) {
  return {
    account: account._id,
    accountCode: account.accountCode,
    accountName: account.accountName,
    debit: Math.round(debit * 100) / 100,
    credit: Math.round(credit * 100) / 100,
    description: description || '',
  };
}

/**
 * Post a balanced journal entry (Draft) for congregation transactions.
 */
async function postTransaction({
  churchId,
  type,
  amount,
  paymentLines,
  currency = 'USD',
  date = new Date(),
  referenceId,
  referenceModel,
  referenceNumber,
  description,
  userId,
  paymentMethod = 'Cash',
  category,
}) {
  await ensureBaseAccounts(churchId, userId);

  const existing = await findExistingEntry(churchId, referenceModel, referenceId);
  if (existing) return existing;

  const cashAccountCode = resolveCashAccountCode(paymentMethod);
  const { year, period } = periodFromDate(date);
  const lines = [];

  if (type === 'Wallet Deposit') {
    const cashAcc = await loadAccount(churchId, cashAccountCode);
    const walletAcc = await loadAccount(churchId, '2100');
    if (!cashAcc || !walletAcc) throw new Error('Ledger accounts not found for wallet deposit');
    lines.push(await buildLine(cashAcc, amount, 0, description));
    lines.push(await buildLine(walletAcc, 0, amount, description));
  } else if (type === 'Member Payment') {
    const walletAcc = await loadAccount(churchId, '2100');
    if (!walletAcc) throw new Error('Member wallet liability account not found');
    const creditLines = [];
    const normalizedLines = Array.isArray(paymentLines) && paymentLines.length > 0
      ? paymentLines
      : [{ paymentType: category || 'OTHER', amount }];
    for (const pl of normalizedLines) {
      const lineAmount = Number(pl.amount || 0);
      if (lineAmount <= 0) continue;
      const incomeCode = getAccountCodeForPaymentType(pl.paymentType);
      const incomeAcc = await loadAccount(churchId, incomeCode);
      if (!incomeAcc) throw new Error(`Income account ${incomeCode} not found`);
      creditLines.push(await buildLine(incomeAcc, 0, lineAmount, `${pl.paymentType} offering`));
    }
    if (creditLines.length === 0) throw new Error('No payment lines to post');
    const totalCredit = creditLines.reduce((sum, line) => sum + line.credit, 0);
    lines.push(await buildLine(walletAcc, totalCredit, 0, description));
    lines.push(...creditLines);
  } else if (type === 'Direct Payment') {
    const cashAcc = await loadAccount(churchId, cashAccountCode);
    if (!cashAcc) throw new Error('Cash account not found');
    const creditLines = [];
    const normalizedLines = Array.isArray(paymentLines) && paymentLines.length > 0
      ? paymentLines
      : [{ paymentType: category || 'OTHER', amount }];
    for (const pl of normalizedLines) {
      const lineAmount = Number(pl.amount || 0);
      if (lineAmount <= 0) continue;
      const incomeCode = getAccountCodeForPaymentType(pl.paymentType);
      const incomeAcc = await loadAccount(churchId, incomeCode);
      if (!incomeAcc) throw new Error(`Income account ${incomeCode} not found`);
      creditLines.push(await buildLine(incomeAcc, 0, lineAmount, `${pl.paymentType} offering`));
    }
    const totalCredit = creditLines.reduce((sum, line) => sum + line.credit, 0);
    lines.push(await buildLine(cashAcc, totalCredit, 0, description));
    lines.push(...creditLines);
  } else if (type === 'Expense') {
    const expenseCode = getAccountCodeForCategory(category);
    const expenseAcc = await loadAccount(churchId, expenseCode);
    const cashAcc = await loadAccount(churchId, cashAccountCode);
    if (!expenseAcc || !cashAcc) throw new Error('Ledger accounts not found for expense');
    lines.push(await buildLine(expenseAcc, amount, 0, description));
    lines.push(await buildLine(cashAcc, 0, amount, description));
  } else if (type === 'Remittance') {
    const remitAcc = await loadAccount(churchId, '5950');
    const cashAcc = await loadAccount(churchId, cashAccountCode);
    if (!remitAcc || !cashAcc) throw new Error('Ledger accounts not found for remittance');
    lines.push(await buildLine(remitAcc, amount, 0, description));
    lines.push(await buildLine(cashAcc, 0, amount, description));
  } else if (type === 'Income' || type === 'Receipt') {
    const cashAcc = await loadAccount(churchId, cashAccountCode);
    const incomeAcc = await loadAccount(churchId, '4200');
    if (!cashAcc || !incomeAcc) throw new Error('Ledger accounts not found for income');
    lines.push(await buildLine(cashAcc, amount, 0, description));
    lines.push(await buildLine(incomeAcc, 0, amount, description));
  } else {
    throw new Error(`Unsupported transaction type: ${type}`);
  }

  const entryNumber = await JournalEntry.generateEntryNumber(churchId, year);
  return JournalEntry.create({
    church: churchId,
    entryNumber,
    entryDate: date,
    referenceType: type,
    referenceId,
    referenceModel,
    referenceNumber,
    description,
    currency,
    periodYear: year,
    period,
    lines,
    createdBy: userId,
    status: 'Draft',
  });
}

module.exports = {
  ensureBaseAccounts,
  postTransaction,
  getAccountCodeForCategory,
  getAccountCodeForPaymentType,
  resolveCashAccountCode,
  PAYMENT_TYPE_INCOME_CODES,
};

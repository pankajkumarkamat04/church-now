const { Payment } = require('../models/Payment');
const MemberBalanceDeposit = require('../models/MemberBalanceDeposit');
const User = require('../models/User');
const { normalizeDisplayCurrency, convertDisplayAmountToUsd } = require('./displayCurrency');
const {
  getActivePaymentTypeCodes,
  normalizeAmountsByOption,
  validatePaymentLineTypes,
  normalizeCode,
} = require('./paymentTypes');
const { attachDepositLedger, attachPaymentLedger } = require('./churchLedgerPosting');

/** Members + church-linked admins — same scope as congregation payment lists. */
function churchPeopleFilter(churchId) {
  if (!churchId) return { _id: null };
  return {
    $or: [
      { church: churchId, role: 'MEMBER' },
      { role: 'ADMIN', $or: [{ church: churchId }, { adminChurches: churchId }] },
    ],
  };
}

function validatePayloadAmount({ amount }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 'Valid amount is required';
  }
  return null;
}

function buildPaymentLinesFromPayload(payload, churchId) {
  return getActivePaymentTypeCodes(churchId).then(async (activeCodes) => {
    const amountsByOption = normalizeAmountsByOption(payload.amountsByOption, activeCodes);
    let entries = Object.entries(amountsByOption).filter(([, amount]) => amount > 0);

    if (entries.length === 0) {
      const amountErr = validatePayloadAmount(payload);
      if (amountErr) return { error: 'Enter at least one payment amount' };
      entries = [[normalizeCode(payload.paymentType || payload.paymentOption), Number(payload.amount)]];
    }

    const typeErr = validatePaymentLineTypes(
      entries.map(([paymentType]) => paymentType),
      activeCodes
    );
    if (typeErr) return { error: typeErr };

    const display = normalizeDisplayCurrency(payload.displayCurrency ?? payload.currency);
    const paymentLinesDisplay = entries.map(([paymentType, amount]) => ({
      paymentType,
      amount: Number(amount),
    }));
    const totalDisplay = paymentLinesDisplay.reduce((sum, line) => sum + line.amount, 0);

    let conv;
    try {
      conv = await convertDisplayAmountToUsd(display, totalDisplay);
    } catch (e) {
      return { error: e.message || 'Currency conversion failed', statusCode: e.statusCode || 400 };
    }

    const factor = totalDisplay > 0 ? conv.amountUsd / totalDisplay : 0;
    const paymentLines = paymentLinesDisplay.map((line) => ({
      paymentType: line.paymentType,
      amount: Math.round(line.amount * factor * 100) / 100,
    }));

    return {
      paymentLines,
      totalAmount: conv.amountUsd,
      conv,
      note: String(payload.note || '').trim(),
      paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
    };
  });
}

async function executeWalletDeposit({
  churchId,
  memberId,
  amountRaw,
  displayCurrency,
  paymentMethod = 'Cash',
  userId,
}) {
  const display = normalizeDisplayCurrency(displayCurrency);
  const conv = await convertDisplayAmountToUsd(display, amountRaw);

  const updated = await User.findOneAndUpdate(
    { _id: memberId, ...churchPeopleFilter(churchId) },
    { $inc: { walletBalance: conv.amountUsd } },
    { new: true, runValidators: true }
  ).select('fullName email walletBalance memberId');
  if (!updated) return { error: 'Person not found in your church', statusCode: 404 };

  const depositLog = await MemberBalanceDeposit.create({
    church: churchId,
    member: updated._id,
    amount: conv.amountUsd,
    currency: 'USD',
    displayCurrency: conv.displayCurrency,
    fxUsdPerUnit: conv.fxUsdPerUnit,
    amountDisplay: conv.amountDisplay,
    paymentMethod: String(paymentMethod || 'Cash').trim(),
    depositedBy: userId,
    depositedAt: new Date(),
  });

  let journalEntry = null;
  try {
    journalEntry = await attachDepositLedger({
      churchId,
      depositDoc: depositLog,
      memberLabel: updated.fullName || updated.email || memberId,
      userId,
      paymentMethod: depositLog.paymentMethod,
    });
  } catch {
    // Wallet credit succeeds; ledger draft is optional.
  }

  return {
    member: updated,
    deposit: depositLog,
    journalEntry,
    receiptNumber: journalEntry?.entryNumber || depositLog.receiptNumber || null,
  };
}

async function executeCongregationPayment({
  churchId,
  targetUserId,
  payload,
  source,
  createdBy,
  paymentMethod: paymentMethodOverride,
}) {
  const built = await buildPaymentLinesFromPayload(payload, churchId);
  if (built.error) return { error: built.error, statusCode: built.statusCode || 400 };

  const { paymentLines, totalAmount, conv, note, paidAt } = built;
  const paymentMethod = String(paymentMethodOverride || payload.paymentMethod || 'Wallet').trim();
  const useWallet = paymentMethod.toLowerCase() === 'wallet';

  const recipient = await User.findOne({ _id: targetUserId, ...churchPeopleFilter(churchId) }).select(
    'fullName email walletBalance'
  );
  if (!recipient) return { error: 'Recipient not found in your church', statusCode: 404 };

  if (useWallet) {
    const updatedMember = await User.findOneAndUpdate(
      { _id: targetUserId, ...churchPeopleFilter(churchId), walletBalance: { $gte: totalAmount } },
      { $inc: { walletBalance: -totalAmount } },
      { new: true }
    ).select('walletBalance fullName email');
    if (!updatedMember) {
      return {
        error: 'Insufficient wallet balance. Deposit funds first.',
        statusCode: 400,
      };
    }

    const row = await Payment.create({
      church: churchId,
      user: targetUserId,
      paymentLines,
      amount: totalAmount,
      currency: 'USD',
      displayCurrency: conv.displayCurrency,
      fxUsdPerUnit: conv.fxUsdPerUnit,
      amountDisplayTotal: conv.amountDisplay,
      note,
      paidAt,
      source,
      paymentMethod: 'Wallet',
      createdBy,
    });

    let journalEntry = null;
    try {
      journalEntry = await attachPaymentLedger({
        churchId,
        paymentDoc: row,
        paymentLines,
        userId: createdBy,
        paymentMethod: 'Wallet',
        memberLabel: recipient.fullName || recipient.email || targetUserId,
      });
    } catch {
      // Payment recorded.
    }

    return {
      payment: row,
      remainingBalance: Number(updatedMember.walletBalance || 0),
      journalEntry,
      receiptNumber: journalEntry?.entryNumber || row.receiptNumber || null,
    };
  }

  const row = await Payment.create({
    church: churchId,
    user: targetUserId,
    paymentLines,
    amount: totalAmount,
    currency: 'USD',
    displayCurrency: conv.displayCurrency,
    fxUsdPerUnit: conv.fxUsdPerUnit,
    amountDisplayTotal: conv.amountDisplay,
    note,
    paidAt,
    source,
    paymentMethod,
    createdBy,
  });

  let journalEntry = null;
  try {
    journalEntry = await attachPaymentLedger({
      churchId,
      paymentDoc: row,
      paymentLines,
      userId: createdBy,
      paymentMethod,
      memberLabel: recipient.fullName || recipient.email || targetUserId,
    });
  } catch {
    // Direct payment recorded.
  }

  return {
    payment: row,
    journalEntry,
    receiptNumber: journalEntry?.entryNumber || row.receiptNumber || null,
  };
}

module.exports = {
  churchPeopleFilter,
  buildPaymentLinesFromPayload,
  executeWalletDeposit,
  executeCongregationPayment,
};

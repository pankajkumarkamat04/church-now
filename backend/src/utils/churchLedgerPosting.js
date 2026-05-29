const { postTransaction } = require('./ledgerUtils');

async function attachPaymentLedger({
  churchId,
  paymentDoc,
  paymentLines,
  userId,
  paymentMethod = 'Wallet',
  memberLabel,
}) {
  const isWallet = String(paymentMethod || '').toLowerCase() === 'wallet';
  const journalEntry = await postTransaction({
    churchId,
    type: isWallet ? 'Member Payment' : 'Direct Payment',
    amount: paymentDoc.amount,
    paymentLines,
    currency: 'USD',
    date: paymentDoc.paidAt,
    referenceId: paymentDoc._id,
    referenceModel: 'Payment',
    description: memberLabel
      ? `${isWallet ? 'Member payment' : 'Direct payment'} — ${memberLabel}`
      : `Congregation payment — ${paymentDoc._id}`,
    userId,
    paymentMethod,
  });
  if (journalEntry?.entryNumber) {
    paymentDoc.receiptNumber = journalEntry.entryNumber;
    paymentDoc.journalEntry = journalEntry._id;
    await paymentDoc.save();
  }
  return journalEntry;
}

async function attachDepositLedger({ churchId, depositDoc, memberLabel, userId, paymentMethod = 'Cash' }) {
  const journalEntry = await postTransaction({
    churchId,
    type: 'Wallet Deposit',
    amount: depositDoc.amount,
    currency: 'USD',
    date: depositDoc.depositedAt,
    referenceId: depositDoc._id,
    referenceModel: 'MemberBalanceDeposit',
    description: `Wallet deposit — ${memberLabel}`,
    userId,
    paymentMethod,
  });
  if (journalEntry?.entryNumber) {
    depositDoc.receiptNumber = journalEntry.entryNumber;
    depositDoc.journalEntry = journalEntry._id;
    await depositDoc.save();
  }
  return journalEntry;
}

async function attachExpenseLedger({ churchId, expenseDoc, userId, paymentMethod = 'Cash' }) {
  const journalEntry = await postTransaction({
    churchId,
    type: 'Expense',
    amount: expenseDoc.amount,
    currency: 'USD',
    date: expenseDoc.expenseDate || new Date(),
    referenceId: expenseDoc._id,
    referenceModel: 'Expense',
    description: expenseDoc.title || 'Congregation expense',
    userId,
    paymentMethod,
    category: expenseDoc.category,
  });
  if (journalEntry?.entryNumber) {
    expenseDoc.receiptNumber = journalEntry.entryNumber;
    expenseDoc.journalEntry = journalEntry._id;
    await expenseDoc.save();
  }
  return journalEntry;
}

async function attachRemittanceLedger({ churchId, remittanceDoc, userId, paymentMethod = 'Cash' }) {
  const label =
    remittanceDoc.remitType === 'MAIN_CHURCH' ? 'Main church remittance' : 'Conference remittance';
  const journalEntry = await postTransaction({
    churchId,
    type: 'Remittance',
    amount: remittanceDoc.amount,
    currency: 'USD',
    date: remittanceDoc.paidAt || new Date(),
    referenceId: remittanceDoc._id,
    referenceModel: 'ChurchRemittance',
    referenceNumber: `${remittanceDoc.monthKey}-${remittanceDoc.remitType}`,
    description: `${label} — ${remittanceDoc.monthKey}`,
    userId,
    paymentMethod,
    category: 'REMITTANCE',
  });
  if (journalEntry?.entryNumber) {
    remittanceDoc.receiptNumber = journalEntry.entryNumber;
    remittanceDoc.journalEntry = journalEntry._id;
    await remittanceDoc.save();
  }
  return journalEntry;
}

module.exports = {
  attachPaymentLedger,
  attachDepositLedger,
  attachExpenseLedger,
  attachRemittanceLedger,
};

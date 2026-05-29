export type LedgerAccount = {
  _id: string;
  accountCode: string;
  accountName: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  accountCategory: string;
  balance: number;
  openingBalance?: number;
  normalBalance: 'Debit' | 'Credit';
  isActive: boolean;
  isSystemAccount?: boolean;
  pendingBalance?: number;
  bankName?: string;
  accountNumber?: string;
  description?: string;
};

export type JournalLine = {
  account?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
};

export type JournalEntry = {
  _id: string;
  entryNumber: string;
  entryDate: string;
  referenceType?: string;
  referenceModel?: string;
  referenceId?: string;
  description: string;
  status: 'Draft' | 'Pending Authorization' | 'Posted' | 'Reversed' | 'Rejected';
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
  verified?: boolean;
  verifiedDate?: string;
  createdBy?: { fullName?: string; email?: string };
  verifiedBy?: { fullName?: string; email?: string };
  rejectionReason?: string;
};

export type BudgetCategory = {
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  notes?: string;
};

export type Budget = {
  _id: string;
  year: number;
  period: 'Annual' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  name: string;
  description?: string;
  incomeCategories: BudgetCategory[];
  expenseCategories: BudgetCategory[];
  totalIncomeBudget: number;
  totalActualIncome: number;
  totalExpenseBudget: number;
  totalActualExpense: number;
  netBudget: number;
  netActual: number;
  status: 'Draft' | 'Approved' | 'Active' | 'Closed' | 'Revised';
  createdBy?: { fullName?: string; email?: string };
  approvedBy?: { fullName?: string; email?: string };
};

export type GlobalPaymentMember = {
  _id: string;
  fullName?: string;
  email?: string;
  walletBalance: number;
  memberId?: string;
  memberRoleDisplay?: string;
  memberCategory?: string;
  role?: string;
};

export type CashBookSummary = {
  cashInHand: number;
  cashAtBank: number;
  total: number;
};

export const BUDGET_PERIODS = ['Annual', 'Q1', 'Q2', 'Q3', 'Q4'] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Cheque',
  'EcoCash',
  'Mobile Money',
  'Wallet',
] as const;

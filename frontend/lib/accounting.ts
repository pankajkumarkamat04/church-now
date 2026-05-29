import { apiFetch } from '@/lib/api';
import type {
  Budget,
  CashBookSummary,
  GlobalPaymentMember,
  JournalEntry,
  LedgerAccount,
} from '@/lib/accountingTypes';

type ApiScope = 'admin' | 'superadmin';

function base(scope: ApiScope, churchId?: string) {
  const prefix = scope === 'admin' ? '/api/admin' : '/api/superadmin';
  const q = churchId ? `?churchId=${encodeURIComponent(churchId)}` : '';
  return { prefix, q };
}

function withChurchQuery(path: string, churchId?: string) {
  if (!churchId) return path;
  return path.includes('?') ? `${path}&churchId=${encodeURIComponent(churchId)}` : `${path}?churchId=${encodeURIComponent(churchId)}`;
}

export async function fetchLedgerAccounts(token: string, scope: ApiScope, churchId?: string) {
  const { prefix, q } = base(scope, churchId);
  return apiFetch<LedgerAccount[]>(`${prefix}/accounting/ledger${q}`, { token });
}

export async function createLedgerAccount(
  token: string,
  body: Record<string, unknown>,
  scope: ApiScope = 'admin'
) {
  const { prefix } = base(scope);
  return apiFetch<LedgerAccount>(`${prefix}/accounting/ledger`, {
    token,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchJournalEntries(token: string, scope: ApiScope, churchId?: string, status?: string) {
  const { prefix } = base(scope, churchId);
  let path = `${prefix}/accounting/ledger/entries`;
  const params = new URLSearchParams();
  if (churchId) params.set('churchId', churchId);
  if (status) params.set('status', status);
  const qs = params.toString();
  if (qs) path += `?${qs}`;
  return apiFetch<JournalEntry[]>(path, { token });
}

export async function fetchAccountTransactions(
  token: string,
  accountId: string,
  scope: ApiScope,
  churchId?: string
) {
  const { prefix } = base(scope, churchId);
  return apiFetch<JournalEntry[]>(
    withChurchQuery(`${prefix}/accounting/ledger/${accountId}/transactions`, churchId),
    { token }
  );
}

export async function verifyJournalEntry(token: string, entryId: string, scope: ApiScope = 'admin') {
  const { prefix } = base(scope);
  return apiFetch<JournalEntry>(`${prefix}/accounting/ledger/entries/${entryId}/verify`, {
    token,
    method: 'PUT',
    body: JSON.stringify({}),
  });
}

export async function rejectJournalEntry(token: string, entryId: string, reason: string, scope: ApiScope = 'admin') {
  const { prefix } = base(scope);
  return apiFetch<JournalEntry>(`${prefix}/accounting/ledger/entries/${entryId}/reject`, {
    token,
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchCashBookSummary(token: string, scope: ApiScope, churchId?: string) {
  const { prefix, q } = base(scope, churchId);
  return apiFetch<CashBookSummary>(`${prefix}/accounting/ledger/cashbook-summary${q}`, { token });
}

export async function fetchBudgets(token: string, scope: ApiScope, churchId?: string, year?: number) {
  const { prefix } = base(scope, churchId);
  const params = new URLSearchParams();
  if (churchId) params.set('churchId', churchId);
  if (year) params.set('year', String(year));
  const qs = params.toString();
  return apiFetch<Budget[]>(`${prefix}/accounting/budget${qs ? `?${qs}` : ''}`, { token });
}

export async function fetchBudgetById(token: string, budgetId: string, scope: ApiScope, churchId?: string) {
  const { prefix } = base(scope, churchId);
  return apiFetch<Budget>(
    withChurchQuery(`${prefix}/accounting/budget/${budgetId}`, churchId),
    { token }
  );
}

export async function createBudget(token: string, body: Record<string, unknown>, scope: ApiScope = 'admin') {
  const { prefix } = base(scope);
  return apiFetch<Budget>(`${prefix}/accounting/budget`, {
    token,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateBudget(
  token: string,
  budgetId: string,
  body: Record<string, unknown>,
  scope: ApiScope = 'admin'
) {
  const { prefix } = base(scope);
  return apiFetch<Budget>(`${prefix}/accounting/budget/${budgetId}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function approveBudget(token: string, budgetId: string, scope: ApiScope = 'admin') {
  const { prefix } = base(scope);
  return apiFetch<Budget>(`${prefix}/accounting/budget/${budgetId}/approve`, {
    token,
    method: 'PUT',
    body: JSON.stringify({}),
  });
}

export async function activateBudget(token: string, budgetId: string, scope: ApiScope = 'admin') {
  const { prefix } = base(scope);
  return apiFetch<Budget>(`${prefix}/accounting/budget/${budgetId}/activate`, {
    token,
    method: 'PUT',
    body: JSON.stringify({}),
  });
}

export async function refreshBudgetActuals(token: string, budgetId: string, scope: ApiScope, churchId?: string) {
  const { prefix } = base(scope, churchId);
  return apiFetch<Budget>(
    withChurchQuery(`${prefix}/accounting/budget/${budgetId}/refresh-actuals`, churchId),
    { token, method: 'POST', body: JSON.stringify({}) }
  );
}

export async function fetchGlobalPaymentMembers(token: string, scope: ApiScope, search?: string, churchId?: string) {
  const { prefix } = base(scope, churchId);
  const params = new URLSearchParams();
  if (churchId) params.set('churchId', churchId);
  if (search) params.set('search', search);
  const qs = params.toString();
  return apiFetch<GlobalPaymentMember[]>(
    `${prefix}/accounting/global-payments/members${qs ? `?${qs}` : ''}`,
    { token }
  );
}

export async function fetchMemberFinancialSummary(
  token: string,
  memberId: string,
  scope: ApiScope,
  churchId?: string
) {
  const { prefix } = base(scope, churchId);
  return apiFetch<{
    member: GlobalPaymentMember;
    summary: {
      totalDeposited: number;
      totalPaid: number;
      walletBalance: number;
      paymentCount: number;
      depositCount: number;
    };
    payments: Array<Record<string, unknown>>;
    deposits: Array<Record<string, unknown>>;
  }>(withChurchQuery(`${prefix}/accounting/global-payments/members/${memberId}`, churchId), { token });
}

export async function recordGlobalDeposit(
  token: string,
  memberId: string,
  body: Record<string, unknown>,
  scope: ApiScope = 'admin'
) {
  const { prefix } = base(scope);
  return apiFetch<{ receiptNumber?: string | null; deposit?: Record<string, unknown> }>(
    `${prefix}/accounting/global-payments/members/${memberId}/deposit`,
    { token, method: 'POST', body: JSON.stringify(body) }
  );
}

export async function recordGlobalPayment(
  token: string,
  memberId: string,
  body: Record<string, unknown>,
  scope: ApiScope = 'admin'
) {
  const { prefix } = base(scope);
  return apiFetch<{ receiptNumber?: string | null; payment?: Record<string, unknown>; remainingBalance?: number }>(
    `${prefix}/accounting/global-payments/members/${memberId}/pay`,
    { token, method: 'POST', body: JSON.stringify(body) }
  );
}

export function formatUsd(amount: number) {
  return `USD ${Number(amount || 0).toFixed(2)}`;
}

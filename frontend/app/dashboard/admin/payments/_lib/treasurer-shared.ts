import type { PaymentOption } from '@/lib/payments';
import type { AuthUser } from '@/lib/api';

export type PaymentRow = {
  _id: string;
  paymentLines?: Array<{ paymentType: string; amount: number }>;
  amount: number;
  currency: string;
  displayCurrency?: string;
  fxUsdPerUnit?: number;
  amountDisplayTotal?: number | null;
  paidAt?: string;
  note?: string;
  source: string;
  user?: {
    _id?: string;
    fullName?: string;
    email?: string;
    memberId?: string;
    memberRoleDisplay?: string;
    memberCategory?: string;
    role?: string;
  };
  createdBy?: { fullName?: string; email?: string };
};

export type MemberBalanceRow = {
  _id: string;
  fullName?: string;
  email?: string;
  walletBalance: number;
  memberId?: string;
  memberRoleDisplay?: string;
  memberCategory?: string;
  role?: string;
};

export type DepositHistoryRow = {
  _id: string;
  amount: number;
  displayCurrency?: string;
  fxUsdPerUnit?: number;
  amountDisplay?: number | null;
  depositedAt?: string;
  member?: {
    _id?: string;
    fullName?: string;
    email?: string;
    memberId?: string;
    memberRoleDisplay?: string;
    memberCategory?: string;
    role?: string;
  };
  depositedBy?: { fullName?: string; email?: string };
};

export function memberStatementHref(id?: string | null): string | null {
  const s = String(id || '').trim();
  return s ? `/dashboard/admin/members/${s}` : null;
}

export function churchRoleLabel(m: { memberRoleDisplay?: string; memberCategory?: string }): string {
  const d = String(m.memberRoleDisplay || '').trim();
  if (d) return d;
  const c = String(m.memberCategory || '').trim();
  return c || 'Member';
}

export function accountTypeLabel(m: { role?: string }): string {
  return m.role === 'ADMIN' ? 'Church admin' : 'Member';
}

export function memberDropdownLabel(m: MemberBalanceRow): string {
  const name = m.fullName?.trim() || m.email || 'Person';
  const mid = m.memberId?.trim();
  const office = churchRoleLabel(m);
  const idPart = mid ? ` · ID ${mid}` : '';
  const acct = accountTypeLabel(m);
  return `${name}${idPart} · ${office} · ${acct}`;
}

export function emptyAmountsByOption(): Record<PaymentOption, string> {
  return {
    TITHE: '',
    BUILDING: '',
    ROOF: '',
    GAZALAND: '',
    UTC: '',
    THANKS: '',
    MUSIC: '',
    XMAS: '',
    HARVEST: '',
  };
}

export function hasTreasurerPrivileges(user: Pick<AuthUser, 'memberRoleDisplay' | 'memberRolesFromChurch'> | null | undefined): boolean {
  if (!user) return false;
  const roles = [
    ...(Array.isArray(user.memberRolesFromChurch) ? user.memberRolesFromChurch : []),
    String(user.memberRoleDisplay || ''),
  ]
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
  return roles.some((role) => role.includes('treasurer'));
}

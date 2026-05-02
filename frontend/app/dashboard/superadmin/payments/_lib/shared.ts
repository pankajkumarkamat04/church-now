export type SuperadminPaymentRow = {
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
  church?: { _id?: string; name?: string };
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

export type SuperadminDepositRow = {
  _id: string;
  amount: number;
  displayCurrency?: string;
  fxUsdPerUnit?: number;
  amountDisplay?: number | null;
  depositedAt?: string;
  church?: { _id?: string; name?: string };
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

export function churchRoleLabel(m: { memberRoleDisplay?: string; memberCategory?: string }): string {
  const d = String(m.memberRoleDisplay || '').trim();
  if (d) return d;
  const c = String(m.memberCategory || '').trim();
  return c || 'Member';
}

export function superadminUserHref(id?: string | null): string | null {
  const s = String(id || '').trim();
  return s ? `/dashboard/superadmin/users/${s}/edit` : null;
}

export function superadminChurchHref(id?: string | null): string | null {
  const s = String(id || '').trim();
  return s ? `/dashboard/superadmin/churches/${s}/edit` : null;
}

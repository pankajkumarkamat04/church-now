export type PersonalLike = {
  name?: string;
  fullName?: string;
  title?: string;
  contactEmail?: string;
  email?: string;
  contactPhone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  addressText?: string;
};

export type PastorRowLike = {
  personal?: PersonalLike;
  member?: { fullName?: string; email?: string };
  church?: { _id?: string; name?: string } | string;
  currentRole?: string;
  assignmentHistory?: Array<{ roleTitle?: string }>;
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
};

export function displayPastorName(r: PastorRowLike): string {
  return r.personal?.name || r.personal?.fullName || r.member?.fullName || '—';
}

export function displayChurchName(r: PastorRowLike): string {
  if (typeof r.church === 'object' && r.church && r.church.name) return r.church.name;
  return '—';
}

export function displayCurrentRole(r: PastorRowLike): string {
  if (r.currentRole) return r.currentRole;
  return r.assignmentHistory?.[0]?.roleTitle || '—';
}

export function formatDateOnly(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function memberAddressString(addr: {
  line1?: string;
  line2?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
} | null | undefined): string {
  if (!addr) return '';
  return [addr.line1, addr.line2, addr.city, addr.stateOrProvince, addr.postalCode, addr.country]
    .filter(Boolean)
    .join(', ');
}

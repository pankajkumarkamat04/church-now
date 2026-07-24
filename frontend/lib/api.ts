import type { MemberCategory } from './memberCategories';

export type { MemberCategory };

export type Role = 'SUPERADMIN' | 'CHURCH_ADMIN' | 'ADMIN' | 'MEMBER';

export type MemberAddress = {
  line1: string;
  line2: string;
  city: string;
  stateOrProvince: string;
  postalCode?: string;
  country: string;
};

export type CouncilBadge = {
  councilId: string;
  councilName?: string;
  badgedVolunteerDate?: string | null;
  badgedRuwadzanoDate?: string | null;
};

export type PositionHeld = {
  _id?: string;
  title: string;
  organization?: string;
  fromDate?: string | null;
  toDate?: string | null;
  notes?: string;
};

export type Gender = 'MALE' | 'FEMALE';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  surname?: string;
  fullName: string;
  /** Display name (same as fullName) */
  name?: string;
  idNumber?: string;
  contactPhone?: string;
  /** Alias for email (primary contact) */
  contact_email?: string;
  contact_phone?: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  date_of_birth?: string | null;
  isFullMember?: boolean;
  membershipDate?: string | null;
  membership_date?: string | null;
  admittedBy?: string;
  baptismDate?: string | null;
  baptism_date?: string | null;
  baptismBy?: string;
  baptismPlace?: string;
  councilBadges?: CouncilBadge[];
  positionsHeld?: PositionHeld[];
  address?: MemberAddress;
  conferences?: Array<
    | {
        _id: string;
        conferenceId?: string;
        name: string;
        description?: string;
        email?: string;
        phone?: string;
      }
    | string
  >;
  /** First linked conference (when populated) */
  conference?: {
    _id: string;
    conferenceId?: string;
    name: string;
    description?: string;
    email?: string;
    phone?: string;
  } | null;
  councilIds?: string[];
  /** Global councils linked via councilIds (names from API) */
  councils?: Array<{ _id: string; name: string }>;
  memberCategory?: MemberCategory;
  /** Badged vs non-badged congregation classification */
  memberBadgeType?: 'BADGED' | 'NON_BADGED';
  /** Labels from church localLeadership / councils (backend-computed). */
  memberRolesFromChurch?: string[];
  /** User appears in church `localLeadership.committeeMembers` (badge-only role). */
  isChurchCommitteeMember?: boolean;
  /** Preferred label for lists: congregation offices or memberCategory fallback. */
  memberRoleDisplay?: string;
  /** True when user is church treasurer or vice treasurer (from local leadership). */
  canManageTreasury?: boolean;
  /** Globally unique member number (members and admins promoted from members). */
  memberId?: string;
  /** True for MEMBER, or ADMIN promoted from a member (home church + member id). Drives default portal. */
  canAccessMemberPortal?: boolean;
  role: Role;
  church:
    | string
    | {
        _id: string;
        name: string;
        address?: string;
        city?: string;
        stateOrProvince?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        email?: string;
        latitude?: number | null;
        longitude?: number | null;
        isActive?: boolean;
        councils?: Array<{ _id: string; name: string }>;
      }
    | null;
  adminChurches?: Array<{
    _id: string;
    name: string;
  }>;
  isActive?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED';
  registrationSource?: 'SYSTEM' | 'SELF_SIGNUP';
  walletBalance?: number;
  /** True when listed on any `Conference.localLeadership` slot (from `/api/auth/me`). */
  isConferenceLeader?: boolean;
  conferenceLeadership?: Array<{
    id: string;
    name: string;
    conferenceId?: string;
    roles: Array<{ key: string; label: string }>;
  }>;
};

/** Standard paginated list envelope from several `/api/superadmin/*` endpoints. */
export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Accept either a raw array or `{ data: [...] }` from paginated APIs. */
export function unwrapPaginatedArray<T>(body: T[] | Paginated<T>): T[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray(body.data)) return body.data;
  return [];
}

const STORAGE_KEY = 'church_auth';

function authStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/** Remove legacy persistent login (localStorage survived browser restarts). */
function clearLegacyPersistentAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  // Local default: Express API. In production set NEXT_PUBLIC_API_URL (or leave empty only if
  // the reverse proxy forwards /api to the backend and you add a Next rewrite).
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5000';
  }
  return '';
}

/** Session-only auth: cleared when the browser session ends (all tabs closed). */
export function loadStoredAuth(): { token: string; user: AuthUser } | null {
  const storage = authStorage();
  if (!storage) return null;
  clearLegacyPersistentAuth();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { token: string; user: AuthUser };
    if (!data?.token || !data?.user) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser): void {
  const storage = authStorage();
  if (!storage) return;
  clearLegacyPersistentAuth();
  storage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearAuth(): void {
  clearLegacyPersistentAuth();
  try {
    authStorage()?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; timeoutMs?: number } = {}
): Promise<T> {
  const { token, timeoutMs, ...init } = options;
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init.headers || {}),
  };
  const t = token ?? loadStoredAuth()?.token;
  if (t) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${t}`;
  }
  const controller = new AbortController();
  const timeout =
    typeof timeoutMs === 'number' && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers, signal: controller.signal }).finally(
    () => {
      if (timeout) clearTimeout(timeout);
    }
  );
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.message || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return body as T;
}

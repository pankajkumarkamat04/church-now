export type Role = 'SUPERADMIN' | 'ADMIN' | 'MEMBER';

export type MemberAddress = {
  line1: string;
  line2: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
};

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  surname?: string;
  fullName: string;
  idNumber?: string;
  contactPhone?: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  address?: MemberAddress;
  conferences?: Array<
    | {
        _id: string;
        conferenceId?: string;
        name: string;
        description?: string;
        email?: string;
        phone?: string;
        contactPerson?: string;
      }
    | string
  >;
  memberCategory?: 'MEMBER' | 'PRESIDENT' | 'MODERATOR';
  /** Labels from church localLeadership / councils (backend-computed). */
  memberRolesFromChurch?: string[];
  /** Preferred label for lists: congregation offices or memberCategory fallback. */
  memberRoleDisplay?: string;
  /** Congregation-unique member number (members and admins promoted from members). */
  memberId?: string;
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
        contactPerson?: string;
        latitude?: number | null;
        longitude?: number | null;
        isActive?: boolean;
      }
    | null;
  adminChurches?: Array<{
    _id: string;
    name: string;
  }>;
  isActive?: boolean;
};

const STORAGE_KEY = 'church_auth';

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

export function loadStoredAuth(): { token: string; user: AuthUser } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { token: string; user: AuthUser };
    if (!data?.token || !data?.user) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  };
  const t = token ?? loadStoredAuth()?.token;
  if (t) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.message || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return body as T;
}

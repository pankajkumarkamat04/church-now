import type { AuthUser, Role } from '@/lib/api';

/**
 * True for congregation members, and for church admins who were members (kept home church + member id).
 * Used for member API access and the member UI shell.
 */
export function canAccessMemberPortal(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'MEMBER') return true;
  if (typeof user.canAccessMemberPortal === 'boolean') {
    return user.canAccessMemberPortal;
  }
  if (user.role === 'ADMIN') {
    const hasChurch = user.church != null;
    const hasMemberId = String(user.memberId || '').trim() !== '';
    return Boolean(hasChurch && hasMemberId);
  }
  return false;
}

/**
 * Post-login and marketing “dashboard” target. Promoted member→admin users land on the member portal first.
 */
export function getDefaultDashboardPath(user: AuthUser | null | undefined): string {
  if (!user) return '/login';
  if (user.role === 'SUPERADMIN') return '/dashboard/superadmin';
  if (user.role === 'MEMBER') return '/dashboard/member';
  if (user.role === 'ADMIN') {
    if (canAccessMemberPortal(user)) {
      return '/dashboard/member';
    }
    return '/dashboard/admin';
  }
  return '/login';
}

/**
 * Shorthand when only a role is known (no user profile) — no dual handling.
 * Prefer getDefaultDashboardPath when you have a full user.
 */
export function dashboardPathForRoleOnly(role: Role): string {
  switch (role) {
    case 'SUPERADMIN':
      return '/dashboard/superadmin';
    case 'ADMIN':
      return '/dashboard/admin';
    case 'MEMBER':
      return '/dashboard/member';
    default:
      return '/login';
  }
}

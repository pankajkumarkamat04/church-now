import type { Role } from '@/lib/api';

export function canAccessSuperadminPanel(role?: string | null): boolean {
  return role === 'SUPERADMIN' || role === 'CHURCH_ADMIN';
}

export function isSystemSuperadmin(role?: string | null): boolean {
  return role === 'SUPERADMIN';
}

export function panelRoleLabel(role?: Role | string | null): string {
  if (role === 'CHURCH_ADMIN') return 'Church Admin';
  if (role === 'SUPERADMIN') return 'Superadmin';
  return String(role || '');
}

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/lib/api';
import { canAccessMemberPortal, getDefaultDashboardPath } from '@/lib/dashboardRouting';
import { AuthLoadingScreen } from './AuthLoadingScreen';

export type ProtectedRouteProps = {
  children: React.ReactNode;
  /**
   * If set, the signed-in user must have one of these roles or they are sent
   * to the dashboard appropriate for their account.
   */
  allowedRoles?: readonly Role[];
  /**
   * When true, only users who can open the member portal (MEMBER or dual ADMIN)
   * may view the subtree. Others are redirected to their default dashboard.
   */
  requireMemberPortal?: boolean;
  /** Replaces the default loading screen while `AuthProvider` resolves the session. */
  loadingFallback?: React.ReactNode;
};

/**
 * Client guard for any route tree: waits for session, optionally enforces
 * role / member-portal rules, and redirects to `/login` or the correct dashboard.
 * Pair with `AuthProvider` in the root layout (already in `app/layout.tsx`).
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  requireMemberPortal,
  loadingFallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const roleKey = useMemo(
    () => (allowedRoles && allowedRoles.length > 0 ? allowedRoles.join(',') : ''),
    [allowedRoles]
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.replace(getDefaultDashboardPath(user));
      return;
    }
    if (requireMemberPortal && !canAccessMemberPortal(user)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, router, roleKey, requireMemberPortal]);

  if (loading) {
    return <>{loadingFallback ?? <AuthLoadingScreen label="Verifying your session…" />}</>;
  }
  if (!user) {
    return null;
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }
  if (requireMemberPortal && !canAccessMemberPortal(user)) {
    return null;
  }
  return <>{children}</>;
}

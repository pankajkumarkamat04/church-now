'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * All `/dashboard/*` routes require a signed-in user. Role-specific rules are
 * enforced in nested layouts (`admin`, `superadmin`, `member`) via `ProtectedRoute`.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

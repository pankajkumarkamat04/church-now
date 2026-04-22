import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MemberDashboardLayout } from '@/components/dashboard/MemberDashboardLayout';

export default function MemberPanelRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireMemberPortal>
      <MemberDashboardLayout>{children}</MemberDashboardLayout>
    </ProtectedRoute>
  );
}

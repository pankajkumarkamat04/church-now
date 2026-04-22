import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SuperadminDashboardLayout } from '@/components/dashboard/SuperadminDashboardLayout';

export default function SuperadminPanelRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['SUPERADMIN']}>
      <SuperadminDashboardLayout>{children}</SuperadminDashboardLayout>
    </ProtectedRoute>
  );
}

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminDashboardLayout } from '@/components/dashboard/AdminDashboardLayout';

export default function AdminPanelRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminDashboardLayout>{children}</AdminDashboardLayout>
    </ProtectedRoute>
  );
}

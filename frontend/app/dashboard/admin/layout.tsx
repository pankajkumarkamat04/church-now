import { AdminDashboardLayout } from '@/components/dashboard/AdminDashboardLayout';

export default function AdminPanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>;
}

import { SuperadminDashboardLayout } from '@/components/dashboard/SuperadminDashboardLayout';

export default function SuperadminPanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperadminDashboardLayout>{children}</SuperadminDashboardLayout>;
}

import { MemberDashboardLayout } from '@/components/dashboard/MemberDashboardLayout';

export default function MemberPanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MemberDashboardLayout>{children}</MemberDashboardLayout>;
}

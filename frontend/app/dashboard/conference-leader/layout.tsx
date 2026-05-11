import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ConferenceLeaderDashboardLayout } from '@/components/dashboard/ConferenceLeaderDashboardLayout';

export default function ConferenceLeaderPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireConferenceLeader>
      <ConferenceLeaderDashboardLayout>{children}</ConferenceLeaderDashboardLayout>
    </ProtectedRoute>
  );
}

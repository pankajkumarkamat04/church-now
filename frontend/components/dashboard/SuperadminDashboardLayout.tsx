'use client';

import { PanelLayout } from '@/components/panels/PanelLayout';

export function SuperadminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayout variant="superadmin">{children}</PanelLayout>;
}

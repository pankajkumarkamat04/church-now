'use client';

import { PanelLayout } from '@/components/panels/PanelLayout';

export function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayout variant="admin">{children}</PanelLayout>;
}

'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Vertical spacing wrapper for dashboard page sections (top-aligned in PanelLayout main). */
export function DashboardPageShell({ children, className = '' }: Props) {
  return (
    <div className={`dashboard-page w-full min-w-0 space-y-5 sm:space-y-6 ${className}`.trim()}>{children}</div>
  );
}

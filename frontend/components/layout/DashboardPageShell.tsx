'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Vertical spacing wrapper for dashboard page sections (used inside centered PanelLayout content). */
export function DashboardPageShell({ children, className = '' }: Props) {
  return <div className={`w-full space-y-6 ${className}`.trim()}>{children}</div>;
}

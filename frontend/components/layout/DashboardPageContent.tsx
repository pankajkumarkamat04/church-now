import type { ReactNode } from 'react';
import { dashboardPage, dashboardPageNarrow } from '@/lib/dashboardPageLayout';

type Props = {
  children: ReactNode;
  /** Use for settings and single-column forms. */
  narrow?: boolean;
  className?: string;
};

/** Full-width page wrapper — prefer this over ad-hoc max-w-* on each page. */
export function DashboardPageContent({ children, narrow = false, className = '' }: Props) {
  const base = narrow ? dashboardPageNarrow : dashboardPage;
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}

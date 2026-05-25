'use client';

import type { ReactNode } from 'react';
import { tabsScroll } from '@/lib/responsiveClasses';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Horizontally scrollable tab strip on phones; inline tabs on larger screens. */
export function DashboardTabs({ children, className = '' }: Props) {
  return (
    <div className={`${tabsScroll} w-full pb-0.5 ${className}`.trim()}>
      <div className="inline-flex min-w-min gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-800">
        {children}
      </div>
    </div>
  );
}

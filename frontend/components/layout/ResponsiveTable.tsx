'use client';

import type { ReactNode } from 'react';
import { tableScroll } from '@/lib/responsiveClasses';

type Props = {
  children: ReactNode;
  className?: string;
  /** Optional caption for screen readers when table scrolls horizontally. */
  scrollLabel?: string;
};

/**
 * Wraps wide tables so they scroll horizontally on phones without breaking layout.
 */
export function ResponsiveTable({ children, className = '', scrollLabel = 'Scroll table horizontally' }: Props) {
  return (
    <div
      className={`${tableScroll} ${className}`.trim()}
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

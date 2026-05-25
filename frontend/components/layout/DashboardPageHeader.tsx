'use client';

import type { ReactNode } from 'react';

type Variant = 'admin' | 'superadmin';

const eyebrowTone: Record<Variant, string> = {
  admin: 'text-sky-700 dark:text-sky-400',
  superadmin: 'text-violet-700 dark:text-violet-400',
};

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Buttons or controls — aligned right on desktop, below title on small screens. */
  actions?: ReactNode;
  variant?: Variant;
  className?: string;
};

/**
 * Page title block: eyebrow, title, and description stay left-aligned;
 * optional actions align to the right of the title row.
 */
export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = 'superadmin',
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}
    >
      <div className="min-w-0 flex-1 text-left">
        {eyebrow ? (
          <p className={`text-xs font-semibold uppercase tracking-wide ${eyebrowTone[variant]}`}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Briefcase, CircleUserRound } from 'lucide-react';
import type { AuthUser } from '@/lib/api';
import { isDualPortalUser } from '@/lib/dashboardRouting';

export type PortalMode = 'member' | 'admin';

type PortalToggleProps = {
  user: AuthUser | null | undefined;
  mode: PortalMode;
  /** Compact label on small screens */
  className?: string;
};

const memberHref = '/dashboard/member';
const adminHref = '/dashboard/admin';

export function PortalToggle({ user, mode, className = '' }: PortalToggleProps) {
  if (!isDualPortalUser(user)) return null;

  const base =
    'inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-medium shadow-sm dark:border-neutral-700 dark:bg-neutral-800/80';
  const segment =
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition sm:px-3';
  const activeMember =
    'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200/80 dark:bg-neutral-900 dark:text-emerald-200 dark:ring-emerald-800/60';
  const idleMember =
    'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100';
  const activeAdmin =
    'bg-white text-sky-800 shadow-sm ring-1 ring-sky-200/80 dark:bg-neutral-900 dark:text-sky-200 dark:ring-sky-800/60';
  const idleAdmin =
    'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100';

  return (
    <div
      className={`${base} ${className}`.trim()}
      role="group"
      aria-label="Switch between member and church admin portal"
    >
      <Link
        href={memberHref}
        className={`${segment} ${mode === 'member' ? activeMember : idleMember}`}
        aria-current={mode === 'member' ? 'page' : undefined}
      >
        <CircleUserRound className="size-3.5 shrink-0" aria-hidden />
        <span>Member</span>
      </Link>
      <Link
        href={adminHref}
        className={`${segment} ${mode === 'admin' ? activeAdmin : idleAdmin}`}
        aria-current={mode === 'admin' ? 'page' : undefined}
      >
        <Briefcase className="size-3.5 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Church admin</span>
        <span className="sm:hidden">Admin</span>
      </Link>
    </div>
  );
}

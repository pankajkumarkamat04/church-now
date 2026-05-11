'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Default choices for the per-page selector (must align with API max limits where applicable). */
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** When set, shows a “Per page” control. Parent should reset `page` to 1 when this fires. */
  onPageSizeChange?: (nextLimit: number) => void;
  /** Override row counts in the selector (defaults to 10, 20, 50, 100). */
  pageSizeOptions?: readonly number[];
}

const selectClass =
  'rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium text-neutral-800 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200';

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className = '',
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const canResize = typeof onPageSizeChange === 'function';
  const opts = useMemo(() => {
    const s = new Set([...pageSizeOptions].filter((n) => n > 0));
    if (limit > 0) s.add(limit);
    return Array.from(s).sort((a, b) => a - b);
  }, [pageSizeOptions, limit]);

  if (total === 0) return null;
  if (!canResize && totalPages <= 1 && total <= limit) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: (number | 'ellipsis')[] = [];
  const MAX_VISIBLE = 5;
  let startPage = Math.max(1, page - Math.floor(MAX_VISIBLE / 2));
  let endPage = Math.min(totalPages, startPage + MAX_VISIBLE - 1);
  if (endPage - startPage < MAX_VISIBLE - 1) {
    startPage = Math.max(1, endPage - MAX_VISIBLE + 1);
  }

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('ellipsis');
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const btnBase =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const btnIdle =
    'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800';
  const btnActive = 'border-violet-500 bg-violet-600 text-white shadow-sm';

  return (
    <div className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}>
      <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Showing <span className="font-medium text-neutral-700 dark:text-neutral-300">{start}</span>–
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{end}</span> of{' '}
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{total}</span> results
        </p>
        {canResize && opts.length > 0 ? (
          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="whitespace-nowrap">Per page</span>
            <select
              value={opts.includes(limit) ? limit : opts[0]}
              aria-label="Rows per page"
              className={selectClass}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next) || next < 1) return;
                onPageSizeChange(next);
              }}
            >
              {opts.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={`${btnBase} ${btnIdle} gap-0.5 pr-2.5`}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </button>

          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-7 items-center justify-center text-xs text-neutral-400 select-none"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`${btnBase} ${p === page ? btnActive : btnIdle}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={`${btnBase} ${btnIdle} gap-0.5 pl-2.5`}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

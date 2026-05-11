'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, limit, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1 && total <= limit) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Build page number list with ellipsis
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
  const btnActive =
    'border-violet-500 bg-violet-600 text-white shadow-sm';

  return (
    <div className={`flex flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Showing <span className="font-medium text-neutral-700 dark:text-neutral-300">{start}–{end}</span> of{' '}
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{total}</span> results
      </p>

      <div className="flex items-center gap-1">
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
            <span key={`ellipsis-${idx}`} className="flex h-8 w-7 items-center justify-center text-xs text-neutral-400 select-none">
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
    </div>
  );
}

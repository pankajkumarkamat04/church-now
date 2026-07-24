'use client';

import { Check, X } from 'lucide-react';

export type CouncilCardOption = {
  _id: string;
  name: string;
  abbreviation?: string;
  description?: string;
};

type Props = {
  options: CouncilCardOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  /** When true (default), many councils can be selected at once. */
  multiple?: boolean;
  label?: string;
  hint?: string;
  id?: string;
  /** Visual density for signup vs dashboard forms */
  size?: 'md' | 'sm';
};

/**
 * Council picker as clickable cards.
 * Multiple selection is on by default — tap each card to add/remove.
 */
export function CouncilCardSelect({
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  required = false,
  multiple = true,
  label = 'Councils',
  hint,
  id = 'council-cards',
  size = 'md',
}: Props) {
  const selectedIds = Array.isArray(value) ? value.map(String) : [];
  const selected = new Set(selectedIds);

  const defaultHint = multiple
    ? 'You can select more than one council. Tap a card to add or remove it.'
    : 'Select one council.';

  function toggle(councilId: string) {
    if (disabled) return;
    const idStr = String(councilId);
    if (multiple) {
      if (selected.has(idStr)) {
        onChange(selectedIds.filter((x) => x !== idStr));
      } else {
        onChange([...selectedIds, idStr]);
      }
      return;
    }
    onChange(selected.has(idStr) ? [] : [idStr]);
  }

  function clearAll() {
    if (disabled || selectedIds.length === 0) return;
    onChange([]);
  }

  const pad = size === 'sm' ? 'p-3' : 'p-3.5 sm:p-4';
  const titleSize = size === 'sm' ? 'text-sm' : 'text-sm sm:text-[15px]';
  const selectedOptions = options.filter((c) => selected.has(String(c._id)));

  return (
    <div>
      {label ? (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
            {label}
            {required ? <span className="text-red-600"> *</span> : null}
            {multiple ? (
              <span className="ml-2 text-xs font-normal text-neutral-500">(multiple allowed)</span>
            ) : null}
          </label>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            {selectedIds.length > 0 ? <span>{selectedIds.length} selected</span> : null}
            {multiple && selectedIds.length > 0 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={clearAll}
                className="cursor-pointer text-neutral-600 underline underline-offset-2 hover:text-neutral-900 disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedOptions.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selectedOptions.map((c) => (
            <span
              key={c._id}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900"
            >
              {c.abbreviation || c.name}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${c.name}`}
                onClick={() => toggle(c._id)}
                className="cursor-pointer rounded-full p-0.5 text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
            />
          ))}
        </div>
      ) : options.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
          No councils available.
        </p>
      ) : (
        <div
          id={id}
          role="group"
          aria-multiselectable={multiple}
          aria-label={label || 'Councils'}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {options.map((c) => {
            const idStr = String(c._id);
            const isOn = selected.has(idStr);
            return (
              <button
                key={idStr}
                type="button"
                disabled={disabled}
                aria-pressed={isOn}
                onClick={() => toggle(idStr)}
                className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border text-left transition ${pad} disabled:cursor-not-allowed disabled:opacity-50 ${
                  isOn
                    ? 'border-sky-600 bg-sky-50 shadow-sm ring-2 ring-sky-600/30'
                    : 'border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border ${
                    multiple ? 'rounded-md' : 'rounded-full'
                  } ${
                    isOn
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-neutral-300 bg-white text-transparent group-hover:border-neutral-400'
                  }`}
                  aria-hidden
                >
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold leading-snug text-neutral-900 ${titleSize}`}>
                    {c.name}
                  </span>
                  {c.abbreviation ? (
                    <span className="mt-0.5 block text-xs font-medium tracking-wide text-neutral-500">
                      {c.abbreviation}
                    </span>
                  ) : null}
                  {c.description ? (
                    <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                      {c.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-500">{hint ?? defaultHint}</p>
    </div>
  );
}

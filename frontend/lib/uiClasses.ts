/**
 * Shared Tailwind class strings for dashboard buttons and form controls.
 * Prefer these over page-local `const btn = …` / `const field = …` copies.
 */

/** Compact outline action button (table rows, toolbars, Link/button). */
export const actionBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';

/** Alias used on list pages — same as {@link actionBtn}. */
export const btn = actionBtn;

/** Alias used on admin member lists — same as {@link actionBtn}. */
export const inputBtn = actionBtn;

/** Full-width / form primary CTA (sky / admin). */
export const primaryBtnSky =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60';

/** Full-width / form primary CTA (violet / superadmin). */
export const primaryBtnViolet =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60';

/** Approve / success solid CTA. */
export const approveBtn =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

/** Soft approve (outline) for list-row approve. */
export const approveBtnOutline =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50';

/** Soft danger / reject outline. */
export const dangerBtnOutline =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50';

/** Soft sky outline (complete profile / secondary). */
export const skyBtnOutline =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50';

/** Soft violet outline (superadmin secondary). */
export const violetBtnOutline =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50';

/** Neutral cancel / secondary form button. */
export const secondaryBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60';

/** Standard text input / select (sky focus — admin). */
export const fieldSky =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

/** Standard text input / select (violet focus — superadmin). */
export const fieldViolet =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

/** Default form field (violet focus). Prefer {@link fieldSky} / {@link fieldViolet} when accent matters. */
export const field = fieldViolet;

export function primaryBtn(accent: 'sky' | 'violet' = 'violet'): string {
  return accent === 'sky' ? primaryBtnSky : primaryBtnViolet;
}

export function fieldClass(accent: 'sky' | 'violet' = 'violet'): string {
  return accent === 'sky' ? fieldSky : fieldViolet;
}

/** Shared Tailwind class strings for responsive dashboard UI. */

/** Horizontal scroll for wide tables on small screens. */
export const tableScroll =
  'table-scroll -mx-1 max-w-[100vw] overflow-x-auto px-1 sm:mx-0 sm:max-w-full sm:px-0';

/** Scrollable tab / pill row on narrow viewports. */
export const tabsScroll = 'tabs-scroll max-w-full overflow-x-auto';

/** Filter / action toolbar: stacks controls on mobile (see globals.css). */
export const toolbarRow = 'toolbar-row flex flex-wrap items-center gap-3';

export const toolbarControl = 'toolbar-control min-w-0 w-full sm:w-auto';

export const toolbarActions = 'toolbar-actions flex flex-wrap items-center gap-2';

/** Responsive stat / card grid. */
export const statsGrid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

/** Card grid for directory-style layouts. */
export const cardGrid = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

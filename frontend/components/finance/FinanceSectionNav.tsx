'use client';

import { SuperadminFinanceReadOnlyBanner } from '@/components/finance/SuperadminFinanceReadOnlyBanner';
import type { FinanceNavVariant } from '@/lib/financeNav';

/**
 * Finance section chrome. Primary navigation lives in the sidebar (M-03);
 * this strip only shows contextual banners — not a duplicate tab row.
 */
export function FinanceSectionNav({ variant }: { variant: FinanceNavVariant }) {
  if (variant !== 'superadmin') return null;
  return <SuperadminFinanceReadOnlyBanner />;
}

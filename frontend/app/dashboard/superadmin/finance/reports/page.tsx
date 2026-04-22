'use client';

import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';
import { FinanceReportsClient } from '@/components/finance/FinanceReportsClient';

export default function SuperadminFinanceReportsPage() {
  const { churches } = useSuperadminChurches();
  return <FinanceReportsClient variant="superadmin" churches={churches} />;
}

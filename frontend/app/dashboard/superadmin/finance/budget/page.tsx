'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { SuperadminChurchFilter } from '@/components/finance/SuperadminChurchFilter';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBudgets, formatUsd } from '@/lib/accounting';
import type { Budget } from '@/lib/accountingTypes';

export default function SuperadminBudgetPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churchId, setChurchId] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !churchId) return;
    setBusy(true);
    try {
      setBudgets(await fetchBudgets(token, 'superadmin', churchId));
    } finally {
      setBusy(false);
    }
  }, [token, churchId]);

  useEffect(() => {
    if (!loading && (!user || !['SUPERADMIN', 'CHURCH_ADMIN'].includes(user.role))) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (token && churchId) load();
  }, [token, churchId, load]);

  return (
    <div className="dashboard-page w-full min-w-0">
      <FinanceSectionNav variant="superadmin" />
      <h1 className="mb-2 text-2xl font-semibold">Budget</h1>
      <SuperadminChurchFilter token={token} value={churchId} onChange={setChurchId} />
      <div className="grid gap-3">
        {budgets.map((b) => (
          <Link key={b._id} href={`/dashboard/superadmin/finance/budget/${b._id}?churchId=${churchId}`} className="block rounded-xl border bg-white p-4 hover:border-violet-300">
            <p className="font-semibold">{b.name}</p>
            <p className="text-sm text-neutral-600">{b.year} · {b.status} · Net {formatUsd(b.netActual)}</p>
          </Link>
        ))}
      </div>
      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}
    </div>
  );
}

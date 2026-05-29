'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';
import { SuperadminChurchFilter } from '@/components/finance/SuperadminChurchFilter';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGlobalPaymentMembers, fetchMemberFinancialSummary, formatUsd } from '@/lib/accounting';
import { memberDropdownLabel } from '@/app/dashboard/admin/payments/_lib/treasurer-shared';

export default function SuperadminGlobalPaymentsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churchId, setChurchId] = useState('');
  const [members, setMembers] = useState<Array<{ _id: string; fullName?: string; email?: string; walletBalance: number; memberId?: string; memberRoleDisplay?: string; memberCategory?: string; role?: string }>>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<{ summary: { walletBalance: number; totalDeposited: number; totalPaid: number } } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!token || !churchId) return;
    const rows = await fetchGlobalPaymentMembers(token, 'superadmin', undefined, churchId);
    setMembers(rows);
    if (rows[0]) setSelectedId(rows[0]._id);
  }, [token, churchId]);

  useEffect(() => {
    if (!loading && (!user || !['SUPERADMIN', 'CHURCH_ADMIN'].includes(user.role))) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (token && churchId) loadMembers();
  }, [token, churchId, loadMembers]);

  useEffect(() => {
    if (!token || !selectedId || !churchId) return;
    setBusy(true);
    fetchMemberFinancialSummary(token, selectedId, 'superadmin', churchId)
      .then((data) => setSummary(data))
      .finally(() => setBusy(false));
  }, [token, selectedId, churchId]);

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <h1 className="mb-2 text-2xl font-semibold">Global Payments</h1>
      <p className="mb-4 text-sm text-neutral-600">Read-only member payment overview by congregation.</p>
      <SuperadminChurchFilter token={token} value={churchId} onChange={setChurchId} />
      {churchId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white divide-y">
            {members.map((m) => (
              <button key={m._id} type="button" onClick={() => setSelectedId(m._id)} className={`w-full px-4 py-3 text-left text-sm ${selectedId === m._id ? 'bg-violet-50' : ''}`}>
                {memberDropdownLabel(m)} · {formatUsd(m.walletBalance)}
              </button>
            ))}
          </div>
          {summary ? (
            <div className="rounded-xl border bg-white p-4">
              <p>Wallet: {formatUsd(summary.summary.walletBalance)}</p>
              <p>Deposited: {formatUsd(summary.summary.totalDeposited)}</p>
              <p>Paid: {formatUsd(summary.summary.totalPaid)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {busy ? <Loader2 className="mt-4 size-6 animate-spin text-violet-600" /> : null}
    </div>
  );
}

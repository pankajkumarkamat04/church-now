'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

type AssetRow = {
  _id: string;
  name: string;
  category: string;
  status: string;
  ownershipType: string;
  location?: string;
  registrationNumber?: string;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  currentEstimatedValue?: number | null;
  notes?: string;
  church?: { _id: string; name?: string } | string | null;
};

export default function SuperadminFinanceAssetsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const result = await apiFetch<AssetRow[]>('/api/superadmin/assets', { token });
      setRows(result);
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load assets'));
    }
  }, [user, token, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="superadmin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Asset register</h1>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ownership</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Reg/Ref</th>
              <th className="px-4 py-3 font-medium">Value (USD)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{row.name}</p>
                  <p className="text-xs text-neutral-500 line-clamp-1">{row.notes || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  {typeof row.church === 'object' && row.church && 'name' in row.church ? row.church.name || '—' : '—'}
                </td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.ownershipType}</td>
                <td className="px-4 py-3">{row.location || '—'}</td>
                <td className="px-4 py-3">{row.registrationNumber || '—'}</td>
                <td className="px-4 py-3">{row.currentEstimatedValue == null ? '—' : Number(row.currentEstimatedValue).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!busy && rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No assets found.</p> : null}
        {busy ? <p className="px-4 py-8 text-center text-sm text-neutral-500">Loading assets…</p> : null}
      </div>
    </div>
  );
}

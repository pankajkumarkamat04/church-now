'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 20;

type PastorTermRow = {
  _id: string;
  pastor?: { fullName?: string; email?: string; memberId?: string };
  termNumber: number;
  termStart: string;
  termEnd: string;
  status: 'ASSIGNED' | 'RENEWED' | 'TRANSFER_REQUIRED' | 'TRANSFERRED';
};

const STATUS_BADGE: Record<string, string> = {
  ASSIGNED: 'bg-emerald-100 text-emerald-800',
  RENEWED: 'bg-sky-100 text-sky-800',
  TRANSFER_REQUIRED: 'bg-amber-100 text-amber-800',
  TRANSFERRED: 'bg-neutral-100 text-neutral-600',
};

export default function AdminPastorTermsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PastorTermRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: PAGE_SIZE });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const res = await apiFetch<{ data: PastorTermRow[]; total: number; totalPages: number; limit: number }>(`/api/admin/pastor-terms?page=${page}&limit=${PAGE_SIZE}`, { token });
      setRows(res.data ?? []);
      setMeta({ total: res.total ?? 0, totalPages: res.totalPages ?? 1, limit: res.limit ?? PAGE_SIZE });
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, [token, user, page]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Spiritual Leader Terms — View</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Read-only view of pastor term assignments for your church. Term management is handled by the Superadmin.
            </p>
          </div>
          <span className="mt-2 w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 sm:mt-0">
            View only
          </span>
        </div>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Pastor / Leader</th>
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800 dark:text-neutral-200">
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium">{row.pastor?.fullName || '—'}</td>
                <td className="px-4 py-3 text-neutral-500">{row.pastor?.memberId || '—'}</td>
                <td className="px-4 py-3">{row.termNumber}/2</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(row.termStart).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(row.termEnd).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] || 'bg-neutral-100 text-neutral-600'}`}>
                    {row.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-neutral-500">No leader terms found.</p>}
      </div>
      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} className="mt-4" />
    </div>
  );
}

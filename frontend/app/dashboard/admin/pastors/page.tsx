'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  displayChurchName,
  displayCurrentRole,
  displayPastorName,
  formatDateOnly,
} from '@/lib/pastorRecordDisplay';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 20;

type PastorRecordRow = {
  _id: string;
  currentRole?: string;
  church?: { _id?: string; name?: string } | string;
  member?: { fullName?: string; email?: string; memberId?: string };
  isActive?: boolean;
  personal?: {
    name?: string; fullName?: string; title?: string;
    contactEmail?: string; email?: string; contactPhone?: string;
    dateOfBirth?: string; gender?: string; address?: string; addressText?: string;
  };
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
};

export default function AdminPastorsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<PastorRecordRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: PAGE_SIZE });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const res = await apiFetch<{ data: PastorRecordRow[]; total: number; totalPages: number; limit: number }>(`/api/admin/pastors?page=${page}&limit=${PAGE_SIZE}`, { token });
      setRecords(res.data ?? []);
      setMeta({ total: res.total ?? 0, totalPages: res.totalPages ?? 1, limit: res.limit ?? PAGE_SIZE });
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, [token, user, page]);

  const filtered = useMemo(() => records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      displayPastorName(r).toLowerCase().includes(q) ||
      displayChurchName(r).toLowerCase().includes(q) ||
      (r.personal?.contactEmail || '').toLowerCase().includes(q) ||
      (r.currentRole || '').toLowerCase().includes(q)
    );
  }), [records, search]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Pastors / Reverends — Record View</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Read-only view of pastor records for your church. Pastor management is handled by the Superadmin.
            </p>
          </div>
          <span className="mt-2 w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 sm:mt-0">
            View only
          </span>
        </div>
        <div className="mt-4">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, email…"
            className="w-full max-w-sm rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
          />
        </div>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Title</th>
              <th className="px-3 py-3 font-medium">Current Role</th>
              <th className="px-3 py-3 font-medium">Contact Email</th>
              <th className="px-3 py-3 font-medium">Contact Phone</th>
              <th className="px-3 py-3 font-medium">DOB</th>
              <th className="px-3 py-3 font-medium">Ordination</th>
              <th className="px-3 py-3 font-medium">Denomination</th>
              <th className="px-3 py-3 font-medium">Qualifications</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800 dark:text-neutral-200">
            {filtered.map((r) => (
              <tr key={r._id} className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${r.isActive === false ? 'opacity-50' : ''}`}>
                <td className="px-3 py-3 font-medium whitespace-nowrap">{displayPastorName(r)}</td>
                <td className="px-3 py-3 max-w-[8rem] truncate">{r.personal?.title || '—'}</td>
                <td className="px-3 py-3 max-w-[10rem] truncate">{displayCurrentRole(r)}</td>
                <td className="px-3 py-3 max-w-[12rem] truncate">{r.personal?.contactEmail || r.personal?.email || '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap">{r.personal?.contactPhone || '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(r.personal?.dateOfBirth)}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(r.credentials?.ordinationDate)}</td>
                <td className="px-3 py-3 max-w-[8rem] truncate">{r.credentials?.denomination || '—'}</td>
                <td className="px-3 py-3 max-w-[12rem] text-xs">{(r.credentials?.qualifications || []).join(', ') || '—'}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive === false ? 'bg-neutral-100 text-neutral-500' : 'bg-emerald-100 text-emerald-700'}`}>
                    {r.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-8 text-center text-sm text-neutral-500">No pastor records found.</p>}
      </div>
      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} className="mt-4" />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';

type CouncilRow = {
  _id: string;
  name: string;
  abbreviation?: string;
  displayOrder?: number;
  isActive?: boolean;
};

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

export default function SuperadminCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CouncilRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paged = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const r = await apiFetch<CouncilRow[]>('/api/superadmin/councils?includeInactive=1', { token });
    setRows(r);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load councils'));
    }
  }, [user, token, load]);

  async function removeCouncil(row: CouncilRow) {
    if (!token || !window.confirm(`Delete council "${row.name}"? Members will be unlinked from it.`)) return;
    setBusyId(row._id);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/councils/${row._id}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete council');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="dashboard-page w-full min-w-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Councils</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create, edit, activate, or delete global councils. Member forms load these dynamically — nothing is hardcoded.
          </p>
        </div>
        <Link
          href="/dashboard/superadmin/councils/create"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Plus className="size-4" />
          New council
        </Link>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Council</th>
              <th className="px-4 py-3 font-medium">Abbreviation</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {paged.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-neutral-600">{row.abbreviation || '—'}</td>
                <td className="px-4 py-3">
                  {row.isActive === false ? (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                      Inactive
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/superadmin/councils/${row._id}/regions`} className={btn}>
                      Regions
                    </Link>
                    <Link href={`/dashboard/superadmin/councils/${row._id}/members`} className={btn}>
                      <Users className="mr-1 size-3.5" />
                      Members
                    </Link>
                    <Link href={`/dashboard/superadmin/councils/${row._id}/edit`} className={btn}>
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void removeCouncil(row)}
                      disabled={busyId === row._id}
                      className={`${btn} border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60`}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            No councils yet. Create one to make it available on signup and member forms.
          </p>
        ) : null}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={rows.length}
          limit={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

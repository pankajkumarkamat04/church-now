'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';

type CouncilRow = { _id: string; name: string };

export default function AdminCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CouncilRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const councils = await apiFetch<Array<{ _id: string; name: string }>>('/api/admin/councils', { token });
      setRows(Array.isArray(councils) ? councils.map((c) => ({ _id: c._id, name: c.name || '' })) : []);
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load councils'));
  }, [token, user]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paged = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-neutral-900">Councils</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Councils are global across all churches and conferences.
        </p>
        <div className="mt-5 rounded-xl border border-neutral-200">
          <div className="space-y-3 p-3 md:hidden">
            {paged.map((row) => (
              <div key={row._id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-sm font-semibold text-neutral-900">{row.name}</p>
                <Link
                  href={`/dashboard/admin/councils/${row._id}/members`}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Users className="size-3.5" />
                  View members
                </Link>
              </div>
            ))}
          </div>
          <table className="hidden w-full min-w-[620px] text-left text-sm md:table">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Council</th>
                <th className="px-4 py-3 text-right font-medium">Members</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {paged.map((row) => (
                <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/admin/councils/${row._id}/members`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <Users className="size-3.5" />
                      View members
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No councils yet.</p> : null}
        </div>
        {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
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

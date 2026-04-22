'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type CouncilRow = { _id: string; name: string };

export default function AdminCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CouncilRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

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

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-neutral-900">Councils</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Councils are global across all churches and conferences.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Council</th>
                <th className="px-4 py-3 text-right font-medium">Members</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {rows.map((row) => (
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
      </div>
    </div>
  );
}

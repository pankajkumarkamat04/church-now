'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type CouncilRow = { _id: string; name: string };

export default function AdminCouncilsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CouncilRow[]>([]);
  const [churchName, setChurchName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'ADMIN') return;
      const church = await apiFetch<{ name?: string; councils?: Array<{ _id: string; name: string }> }>(
        '/api/admin/church',
        { token }
      );
      setChurchName(church.name || 'My church');
      setRows(Array.isArray(church.councils) ? church.councils.map((c) => ({ _id: c._id, name: c.name || '' })) : []);
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load councils'));
  }, [token, user]);

  async function removeCouncil(councilId: string) {
    if (!token || !window.confirm('Delete this council?')) return;
    setBusyId(councilId);
    setErr(null);
    try {
      const church = await apiFetch<{ councils?: Array<{ _id: string; name: string; roles?: unknown[] }> }>('/api/admin/church', { token });
      const next = (church.councils || []).filter((c) => c._id !== councilId);
      await apiFetch('/api/admin/church', {
        method: 'PUT',
        token,
        body: JSON.stringify({ councils: next }),
      });
      setRows(next.map((c) => ({ _id: c._id, name: c.name })));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete council');
    } finally {
      setBusyId(null);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-neutral-900">Councils</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/admin/members/create" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Add member to church
            </Link>
            <Link href="/dashboard/admin/councils/create" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">
              <Plus className="size-4" />
              Add council
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Manage councils for {churchName}. Use separate pages to create and edit.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Council</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/admin/councils/${row._id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                        <Pencil className="size-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeCouncil(row._id)}
                        disabled={busyId === row._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    </div>
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

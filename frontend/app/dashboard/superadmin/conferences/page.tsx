'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination } from '@/components/ui/Pagination';
import {
  ConferenceLeadershipModal,
  conferenceLeadershipSummary,
} from '@/components/conference/ConferenceLeadershipModal';

const actionIconBtn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

type Conference = {
  _id: string;
  name: string;
  conferenceId?: string;
  description?: string;
  isActive: boolean;
  /** Present when API populates leadership (list uses same shape as GET). */
  localLeadership?: Record<string, string | { _id?: string } | null | undefined>;
};

export default function SuperadminConferencesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Conference[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [leadershipConference, setLeadershipConference] = useState<Conference | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });

  const load = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<{ data: Conference[]; total: number; totalPages: number; limit: number }>(
      `/api/superadmin/conferences?page=${page}&limit=${pageSize}`,
      { token }
    );
    setRows(res.data ?? []);
    setMeta({ total: res.total ?? 0, totalPages: res.totalPages ?? 1, limit: res.limit ?? pageSize });
  }, [token, page, pageSize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  async function removeConference(id: string) {
    if (!token || !window.confirm('Delete this conference? It must not be linked to any main or sub church.')) return;
    setBusyDeleteId(id);
    try {
      await apiFetch(`/api/superadmin/conferences/${id}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyDeleteId(null);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Conferences</h1>
          <p className="mt-1 text-sm text-neutral-600">Manage conferences with separate create and edit routes.</p>
        </div>
        <Link
          href="/dashboard/superadmin/conferences/create"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Plus className="size-4" />
          New conference
        </Link>
      </div>
      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Conference ID</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-medium text-neutral-900">{r.name}</td>
                  <td className="px-4 py-2 text-neutral-600">{r.conferenceId || '—'}</td>
                  <td className="px-4 py-2 text-neutral-600">{r.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/dashboard/superadmin/conferences/${r._id}/edit`}
                        className="inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setLeadershipConference(r)}
                        className={actionIconBtn}
                        title={conferenceLeadershipSummary(r)}
                        aria-label="Edit conference leadership"
                      >
                        <Shield className="size-3.5" aria-hidden />
                      </button>
                      <Link
                        href={`/dashboard/superadmin/conferences/${r._id}/churches`}
                        className="inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Building2 className="mr-1 size-3.5" />
                        Churches
                      </Link>
                      <button
                        type="button"
                        disabled={busyDeleteId === r._id}
                        onClick={() => removeConference(r._id)}
                        className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {busyDeleteId === r._id ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Trash2 className="mr-1 size-3.5" />}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No conferences yet.</p> : null}
      </div>
      <Pagination
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={meta.limit}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        className="mt-4"
      />

      <ConferenceLeadershipModal
        open={Boolean(leadershipConference)}
        onClose={() => setLeadershipConference(null)}
        conferenceId={leadershipConference?._id || ''}
        conferenceName={leadershipConference?.name || ''}
        token={token}
        onSaved={() => {
          load().catch(() => {});
        }}
      />
    </div>
  );
}

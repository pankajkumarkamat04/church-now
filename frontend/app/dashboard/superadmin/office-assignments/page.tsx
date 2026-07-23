'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type Assignment = {
  _id: string;
  roleLabel: string;
  roleKey: string;
  status: string;
  startDate?: string;
  endDate?: string;
  user?: { _id: string; fullName?: string; email?: string; memberId?: string };
  council?: { name?: string; abbreviation?: string } | null;
  region?: { name?: string; code?: string } | null;
  scopeType?: string;
};

type OfficeRole = { _id: string; roleKey: string; roleLabel: string };
type Council = { _id: string; name: string };
type Region = { _id: string; name: string; council?: string | { _id: string } };

export default function OfficeAssignmentsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [roles, setRoles] = useState<OfficeRole[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [roleDefinitionId, setRoleDefinitionId] = useState('');
  const [councilId, setCouncilId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [assignments, roleRows, councilRows, regionRows] = await Promise.all([
      apiFetch<Assignment[]>('/api/superadmin/office-assignments', { token }),
      apiFetch<OfficeRole[]>('/api/superadmin/office-roles', { token }),
      apiFetch<Council[]>('/api/superadmin/councils', { token }),
      apiFetch<Region[]>('/api/superadmin/council-regions', { token }),
    ]);
    setRows(assignments);
    setRoles(roleRows);
    setCouncils(councilRows);
    setRegions(regionRows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load assignments'));
    }
  }, [user, token, load]);

  const filteredRegions = regions.filter((r) => {
    if (!councilId) return true;
    const c = r.council;
    return typeof c === 'string' ? c === councilId : c?._id === councilId;
  });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !memberEmail.trim() || !roleDefinitionId) {
      setErr('Enter member email and select an office role');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/office-assignments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email: memberEmail.trim(),
          roleDefinitionId,
          councilId: councilId || undefined,
          regionId: regionId || undefined,
          scopeType: regionId ? 'COUNCIL_REGION' : councilId ? 'COUNCIL' : 'COUNCIL',
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      setMemberEmail('');
      setRoleDefinitionId('');
      setRegionId('');
      setStartDate('');
      setEndDate('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to assign office');
    } finally {
      setBusy(false);
    }
  }

  async function endAssignment(id: string) {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/office-assignments/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status: 'ENDED', endDate: new Date().toISOString().slice(0, 10) }),
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to end assignment');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="dashboard-page w-full min-w-0">
      <Link href="/dashboard/superadmin/office-roles" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Office roles
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Office assignments</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Assign multiple scoped offices with term dates. Expired terms lose elevated office status automatically.
      </p>

      {err ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form onSubmit={onCreate} className="mt-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="member-email" className="mb-1 block text-xs font-medium text-neutral-600">
              Member email
            </label>
            <input
              id="member-email"
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="member@example.com"
              required
              className={field}
            />
          </div>
          <div>
            <label htmlFor="assign-role" className="mb-1 block text-xs font-medium text-neutral-600">
              Office role
            </label>
            <select
              id="assign-role"
              value={roleDefinitionId}
              onChange={(e) => setRoleDefinitionId(e.target.value)}
              required
              className={field}
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.roleLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-council" className="mb-1 block text-xs font-medium text-neutral-600">
              Council
            </label>
            <select id="assign-council" value={councilId} onChange={(e) => { setCouncilId(e.target.value); setRegionId(''); }} className={field}>
              <option value="">Select council</option>
              {councils.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-region" className="mb-1 block text-xs font-medium text-neutral-600">
              Region (optional)
            </label>
            <select id="assign-region" value={regionId} onChange={(e) => setRegionId(e.target.value)} className={field}>
              <option value="">No region / council-wide</option>
              {filteredRegions.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-start" className="mb-1 block text-xs font-medium text-neutral-600">
              Start date
            </label>
            <input id="assign-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="assign-end" className="mb-1 block text-xs font-medium text-neutral-600">
              End date
            </label>
            <input id="assign-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Assign office
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.user?.fullName || row.user?.email || '—'}</div>
                  <div className="text-xs text-neutral-500">{row.user?.memberId || ''}</div>
                </td>
                <td className="px-4 py-3">{row.roleLabel}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {[row.council?.name, row.region?.name].filter(Boolean).join(' · ') || row.scopeType || '—'}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {(row.startDate || '').slice(0, 10) || '—'} → {(row.endDate || '').slice(0, 10) || 'open'}
                </td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 text-right">
                  {row.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      onClick={() => void endAssignment(row._id)}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                    >
                      End
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No office assignments yet.</p>
        ) : null}
      </div>
    </div>
  );
}

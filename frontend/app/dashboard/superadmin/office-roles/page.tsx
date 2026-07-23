'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type OfficeRole = {
  _id: string;
  roleKey: string;
  roleLabel: string;
  council?: { _id: string; name: string; abbreviation?: string } | null;
  isActive?: boolean;
  sortOrder?: number;
};

type Council = { _id: string; name: string; abbreviation?: string };

export default function OfficeRolesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<OfficeRole[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roleKey, setRoleKey] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [councilId, setCouncilId] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [roles, councilRows] = await Promise.all([
      apiFetch<OfficeRole[]>('/api/superadmin/office-roles?includeInactive=1', { token }),
      apiFetch<Council[]>('/api/superadmin/councils?includeInactive=1', { token }),
    ]);
    setRows(roles);
    setCouncils(councilRows);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load office roles'));
    }
  }, [user, token, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/office-roles', {
        method: 'POST',
        token,
        body: JSON.stringify({
          roleKey: roleKey.trim().toUpperCase().replace(/\s+/g, '_'),
          roleLabel: roleLabel.trim(),
          councilId: councilId || undefined,
        }),
      });
      setRoleKey('');
      setRoleLabel('');
      setCouncilId('');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create role');
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(row: OfficeRole) {
    if (!token || !window.confirm(`Delete office role "${row.roleLabel}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/office-roles/${row._id}`, { method: 'DELETE', token });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to delete role');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="dashboard-page w-full min-w-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Office roles</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Configurable scoped offices (CYF President, Treasurer, Chairperson, etc.). Assignments are separate from
            membership and may include council, region and term dates.
          </p>
        </div>
        <Link
          href="/dashboard/superadmin/office-assignments"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          View assignments
        </Link>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <form onSubmit={onCreate} className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div>
          <label htmlFor="role-key" className="mb-1 block text-xs font-medium text-neutral-600">
            Role key
          </label>
          <input
            id="role-key"
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value)}
            required
            placeholder="CYF_PRESIDENT"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="role-label" className="mb-1 block text-xs font-medium text-neutral-600">
            Label
          </label>
          <input
            id="role-label"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            required
            placeholder="CYF President"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="role-council" className="mb-1 block text-xs font-medium text-neutral-600">
            Council scope (optional)
          </label>
          <select id="role-council" value={councilId} onChange={(e) => setCouncilId(e.target.value)} className={field}>
            <option value="">Any / general</option>
            {councils.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.abbreviation ? ` (${c.abbreviation})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add role
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Council</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium">{row.roleLabel}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600">{row.roleKey}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {row.council?.name || 'Any'}
                  {row.council?.abbreviation ? ` (${row.council.abbreviation})` : ''}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void removeRole(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

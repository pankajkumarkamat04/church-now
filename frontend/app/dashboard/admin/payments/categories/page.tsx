'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { useAdminPaymentTypes, type ChurchPaymentTypeRow } from '@/lib/paymentTypes';
import { hasTreasurerPrivileges } from '../_lib/treasurer-shared';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

export default function AdminPaymentCategoriesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { types, loading: typesLoading, error, reload } = useAdminPaymentTypes(token);
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const canManage = hasTreasurerPrivileges(user);

  if (!loading && (!user || user.role !== 'ADMIN')) {
    router.replace('/login');
    return null;
  }
  if (!user || user.role !== 'ADMIN') return null;

  if (!canManage) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Only the church Treasurer or Vice Treasurer can add or manage payment types. Ask your church admin to assign
        you under Church settings → Local leadership.
      </p>
    );
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setFormErr(null);
    try {
      await apiFetch('/api/admin/payment-types', {
        method: 'POST',
        token,
        body: JSON.stringify({
          label: label.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
        }),
      });
      setLabel('');
      setCode('');
      await reload();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: ChurchPaymentTypeRow) {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/payment-types/${row._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await reload();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: ChurchPaymentTypeRow) {
    if (!token || row.isSystem) return;
    if (!window.confirm(`Remove "${row.label}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/payment-types/${row._id}`, { method: 'DELETE', token });
      await reload();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-page dashboard-page--narrow w-full min-w-0 space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
        Add your own offering categories (e.g. missions, youth fund). Built-in types like Tithe can be deactivated but not
        deleted. Members see only active categories when paying.
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}
      {formErr && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{formErr}</p>}

      <form onSubmit={(e) => void onAdd(e)} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Add category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Display name</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Missions"
              className={field}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Code (optional)</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Auto from name if empty"
              className={field}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || !label.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add category
        </button>
      </form>

      <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800">
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {typesLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : (
              types.map((row) => (
                <tr key={row._id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">
                    {row.label}
                    {row.isSystem ? (
                      <span className="ml-2 text-xs font-normal text-neutral-500">(built-in)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600">{row.code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleActive(row)}
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-50"
                      >
                        {row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {!row.isSystem ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeRow(row)}
                          className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

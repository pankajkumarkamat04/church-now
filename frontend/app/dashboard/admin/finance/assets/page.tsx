'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceSectionNav } from '@/components/finance/FinanceSectionNav';

type AssetCategory =
  | 'PROPERTY'
  | 'MOTOR_VEHICLE'
  | 'FARM'
  | 'LAND'
  | 'BUILDING'
  | 'EQUIPMENT'
  | 'FURNITURE'
  | 'OTHER';
type AssetStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'INACTIVE' | 'SOLD' | 'DISPOSED';
type OwnershipType = 'OWNED' | 'LEASED' | 'DONATED';

type AssetRow = {
  _id: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  ownershipType: OwnershipType;
  location?: string;
  registrationNumber?: string;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  currentEstimatedValue?: number | null;
  notes?: string;
};

type AssetPayload = {
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  ownershipType: OwnershipType;
  location: string;
  registrationNumber: string;
  acquisitionDate: string;
  acquisitionCost: string;
  currentEstimatedValue: string;
  notes: string;
};

const CATEGORY_OPTIONS: Array<{ value: AssetCategory; label: string }> = [
  { value: 'PROPERTY', label: 'Property' },
  { value: 'MOTOR_VEHICLE', label: 'Motor vehicle' },
  { value: 'FARM', label: 'Farm' },
  { value: 'LAND', label: 'Land' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'OTHER', label: 'Other' },
];
const STATUS_OPTIONS: Array<{ value: AssetStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'DISPOSED', label: 'Disposed' },
];
const OWNERSHIP_OPTIONS: Array<{ value: OwnershipType; label: string }> = [
  { value: 'OWNED', label: 'Owned' },
  { value: 'LEASED', label: 'Leased' },
  { value: 'DONATED', label: 'Donated' },
];

const initialForm: AssetPayload = {
  name: '',
  category: 'PROPERTY',
  status: 'ACTIVE',
  ownershipType: 'OWNED',
  location: '',
  registrationNumber: '',
  acquisitionDate: '',
  acquisitionCost: '',
  currentEstimatedValue: '',
  notes: '',
};

function toPayload(form: AssetPayload) {
  return {
    name: form.name.trim(),
    category: form.category,
    status: form.status,
    ownershipType: form.ownershipType,
    location: form.location.trim(),
    registrationNumber: form.registrationNumber.trim(),
    acquisitionDate: form.acquisitionDate || null,
    acquisitionCost: form.acquisitionCost === '' ? null : Number(form.acquisitionCost),
    currentEstimatedValue: form.currentEstimatedValue === '' ? null : Number(form.currentEstimatedValue),
    notes: form.notes.trim(),
  };
}

function toForm(row: AssetRow): AssetPayload {
  return {
    name: row.name || '',
    category: row.category || 'OTHER',
    status: row.status || 'ACTIVE',
    ownershipType: row.ownershipType || 'OWNED',
    location: row.location || '',
    registrationNumber: row.registrationNumber || '',
    acquisitionDate: row.acquisitionDate ? new Date(row.acquisitionDate).toISOString().slice(0, 10) : '',
    acquisitionCost: row.acquisitionCost == null ? '' : String(row.acquisitionCost),
    currentEstimatedValue: row.currentEstimatedValue == null ? '' : String(row.currentEstimatedValue),
    notes: row.notes || '',
  };
}

export default function AdminFinanceAssetsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [form, setForm] = useState<AssetPayload>(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    const query = params.toString();
    const result = await apiFetch<AssetRow[]>(`/api/admin/assets${query ? `?${query}` : ''}`, { token });
    setRows(result);
  }, [token, categoryFilter, statusFilter]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load assets'));
    }
  }, [user, token, load]);

  const submitLabel = editId ? 'Update asset' : 'Add asset';
  const totalValue = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.currentEstimatedValue || 0), 0),
    [rows]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const payload = toPayload(form);
      if (!payload.name) {
        throw new Error('Asset name is required');
      }
      if (editId) {
        await apiFetch(`/api/admin/assets/${editId}`, { method: 'PUT', token, body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/admin/assets', { method: 'POST', token, body: JSON.stringify(payload) });
      }
      setForm(initialForm);
      setEditId(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save asset');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this asset record?')) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/admin/assets/${id}`, { method: 'DELETE', token });
      if (editId === id) {
        setEditId(null);
        setForm(initialForm);
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete asset');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <FinanceSectionNav variant="admin" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Asset management</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Build an e-governance style register for church properties, vehicles, farms, and other assets.
        </p>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Registered assets</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Estimated total value</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">USD {totalValue.toFixed(2)}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Asset name</label>
          <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Category</label>
          <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value as AssetCategory }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
          <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as AssetStatus }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Ownership</label>
          <select value={form.ownershipType} onChange={(e) => setForm((s) => ({ ...s, ownershipType: e.target.value as OwnershipType }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            {OWNERSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Location</label>
          <input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Reg./Reference</label>
          <input value={form.registrationNumber} onChange={(e) => setForm((s) => ({ ...s, registrationNumber: e.target.value }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Acquisition date</label>
          <input type="date" value={form.acquisitionDate} onChange={(e) => setForm((s) => ({ ...s, acquisitionDate: e.target.value }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Acquisition cost (USD)</label>
          <input type="number" min="0" step="0.01" value={form.acquisitionCost} onChange={(e) => setForm((s) => ({ ...s, acquisitionCost: e.target.value }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Current value (USD)</label>
          <input type="number" min="0" step="0.01" value={form.currentEstimatedValue} onChange={(e) => setForm((s) => ({ ...s, currentEstimatedValue: e.target.value }))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-neutral-600">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-3 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
            {busy ? 'Saving…' : submitLabel}
          </button>
          {editId ? (
            <button type="button" onClick={() => { setEditId(null); setForm(initialForm); }} className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All status</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" onClick={() => load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to refresh'))} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ownership</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Reg/Ref</th>
              <th className="px-4 py-3 font-medium">Acquisition</th>
              <th className="px-4 py-3 font-medium">Current value</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{row.name}</p>
                  <p className="text-xs text-neutral-500 line-clamp-1">{row.notes || '—'}</p>
                </td>
                <td className="px-4 py-3">{CATEGORY_OPTIONS.find((o) => o.value === row.category)?.label || row.category}</td>
                <td className="px-4 py-3">{STATUS_OPTIONS.find((o) => o.value === row.status)?.label || row.status}</td>
                <td className="px-4 py-3">{OWNERSHIP_OPTIONS.find((o) => o.value === row.ownershipType)?.label || row.ownershipType}</td>
                <td className="px-4 py-3">{row.location || '—'}</td>
                <td className="px-4 py-3">{row.registrationNumber || '—'}</td>
                <td className="px-4 py-3">
                  <p>{row.acquisitionDate ? new Date(row.acquisitionDate).toLocaleDateString() : '—'}</p>
                  <p className="text-xs text-neutral-500">{row.acquisitionCost == null ? '—' : `USD ${Number(row.acquisitionCost).toFixed(2)}`}</p>
                </td>
                <td className="px-4 py-3 font-medium">{row.currentEstimatedValue == null ? '—' : `USD ${Number(row.currentEstimatedValue).toFixed(2)}`}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditId(row._id); setForm(toForm(row)); }} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(row._id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No assets found.</p> : null}
      </div>
    </div>
  );
}

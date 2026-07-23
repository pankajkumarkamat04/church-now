'use client';

import { useEffect, useState } from 'react';
import { apiFetch, type Paginated, unwrapPaginatedArray } from '@/lib/api';

export type BudgetOwnerType = 'CHURCH' | 'COUNCIL' | 'COUNCIL_REGION' | 'CONFERENCE' | 'NATIONAL';

export type BudgetOwnerSelection = {
  ownerType: BudgetOwnerType;
  ownerId: string;
};

type Props = {
  token: string | null;
  value: BudgetOwnerSelection | null;
  onChange: (next: BudgetOwnerSelection | null) => void;
};

const OWNER_OPTIONS: { value: BudgetOwnerType; label: string }[] = [
  { value: 'CHURCH', label: 'Congregation (church)' },
  { value: 'COUNCIL', label: 'Council' },
  { value: 'COUNCIL_REGION', label: 'Council region' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'NATIONAL', label: 'National / denomination' },
];

const NATIONAL_ID = '000000000000000000000001';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export function BudgetOwnerFilter({ token, value, onChange }: Props) {
  const [ownerType, setOwnerType] = useState<BudgetOwnerType>(value?.ownerType || 'CHURCH');
  const [ownerId, setOwnerId] = useState(value?.ownerId || '');
  const [options, setOptions] = useState<Array<{ _id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setBusy(true);
      try {
        if (ownerType === 'CHURCH') {
          const rows = await apiFetch<Array<{ _id: string; name: string }>>('/api/superadmin/sub-churches', {
            token: token!,
          });
          if (!cancelled) setOptions(rows.map((r) => ({ _id: r._id, name: r.name })));
        } else if (ownerType === 'COUNCIL') {
          const rows = await apiFetch<Array<{ _id: string; name: string; abbreviation?: string }>>(
            '/api/superadmin/councils',
            { token: token! }
          );
          if (!cancelled) {
            setOptions(
              rows.map((r) => ({
                _id: r._id,
                name: r.abbreviation ? `${r.name} (${r.abbreviation})` : r.name,
              }))
            );
          }
        } else if (ownerType === 'COUNCIL_REGION') {
          const rows = await apiFetch<
            Array<{ _id: string; name: string; council?: { name?: string; abbreviation?: string } }>
          >('/api/superadmin/council-regions', { token: token! });
          if (!cancelled) {
            setOptions(
              rows.map((r) => ({
                _id: r._id,
                name: r.council?.abbreviation
                  ? `${r.name} · ${r.council.abbreviation}`
                  : r.council?.name
                    ? `${r.name} · ${r.council.name}`
                    : r.name,
              }))
            );
          }
        } else if (ownerType === 'CONFERENCE') {
          const raw = await apiFetch<
            Array<{ _id: string; name: string }> | Paginated<{ _id: string; name: string }>
          >('/api/superadmin/conferences?limit=500', { token: token! });
          const rows = unwrapPaginatedArray(raw);
          if (!cancelled) setOptions(rows.map((r) => ({ _id: r._id, name: r.name })));
        } else {
          if (!cancelled) setOptions([{ _id: NATIONAL_ID, name: 'UCCZ National' }]);
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, ownerType]);

  useEffect(() => {
    setOwnerId('');
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when type changes only
  }, [ownerType]);

  useEffect(() => {
    if (ownerType === 'NATIONAL') {
      setOwnerId(NATIONAL_ID);
      onChange({ ownerType: 'NATIONAL', ownerId: NATIONAL_ID });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType]);

  return (
    <div className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <div>
        <label htmlFor="budget-owner-type" className="mb-1 block text-xs font-medium text-neutral-600">
          Budget owner type
        </label>
        <select
          id="budget-owner-type"
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value as BudgetOwnerType)}
          className={field}
        >
          {OWNER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="budget-owner-id" className="mb-1 block text-xs font-medium text-neutral-600">
          Owner unit
        </label>
        <select
          id="budget-owner-id"
          value={ownerId}
          disabled={busy || ownerType === 'NATIONAL'}
          onChange={(e) => {
            const id = e.target.value;
            setOwnerId(id);
            onChange(id ? { ownerType, ownerId: id } : null);
          }}
          className={field}
        >
          <option value="">{busy ? 'Loading…' : 'Select owner'}</option>
          {options.map((o) => (
            <option key={o._id} value={o._id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <p className="sm:col-span-2 text-xs text-neutral-500">
        Council and regional budgets are separate from congregation budgets. Actuals roll up from related churches where
        applicable.
      </p>
    </div>
  );
}

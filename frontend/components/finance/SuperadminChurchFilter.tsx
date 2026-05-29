'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ChurchOption = { _id: string; name: string };

export function SuperadminChurchFilter({
  token,
  value,
  onChange,
}: {
  token: string | null;
  value: string;
  onChange: (churchId: string) => void;
}) {
  const [churches, setChurches] = useState<ChurchOption[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<{ data?: ChurchOption[] } | ChurchOption[]>('/api/superadmin/churches?limit=500', { token });
    const rows = Array.isArray(res) ? res : res.data || [];
    setChurches(rows);
    if (!value && rows[0]?._id) onChange(String(rows[0]._id));
  }, [token, value, onChange]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  return (
    <div className="mb-4 max-w-md">
      <label className="mb-1 block text-xs font-medium text-neutral-600">Congregation</label>
      <select
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select church…</option>
        {churches.map((c) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

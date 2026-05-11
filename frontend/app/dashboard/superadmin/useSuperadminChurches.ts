'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '@/app/dashboard/superadmin/churches/types';

export function useSuperadminChurches() {
  const { token, user } = useAuth();
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const raw = await apiFetch<ChurchRecord[] | Paginated<ChurchRecord>>('/api/superadmin/churches?limit=500', {
      token,
    });
    setChurches(unwrapPaginatedArray(raw));
  }, [token]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load churches'));
    }
  }, [user, token, load]);

  return { churches, load, err };
}

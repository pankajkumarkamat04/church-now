'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, type AuthUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export type SuperadminChurch = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  councils?: Array<{ _id?: string; name: string }>;
};

export function useSuperadminData() {
  const { token, user } = useAuth();
  const [churches, setChurches] = useState<SuperadminChurch[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [c, u] = await Promise.all([
      apiFetch<SuperadminChurch[]>('/api/superadmin/churches', { token }),
      apiFetch<AuthUser[]>('/api/superadmin/users', { token }),
    ]);
    setChurches(c);
    setUsers(u);
  }, [token]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  return { churches, users, err, setErr, load, token };
}

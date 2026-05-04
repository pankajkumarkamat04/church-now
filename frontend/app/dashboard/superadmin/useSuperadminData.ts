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

export type SuperadminCouncil = {
  _id: string;
  name: string;
};

export function useSuperadminData() {
  const { token, user } = useAuth();
  const [churches, setChurches] = useState<SuperadminChurch[]>([]);
  const [councils, setCouncils] = useState<SuperadminCouncil[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const [c, u, co] = await Promise.all([
      apiFetch<SuperadminChurch[]>('/api/superadmin/churches', { token }),
      apiFetch<AuthUser[]>('/api/superadmin/users', { token }),
      apiFetch<SuperadminCouncil[]>('/api/superadmin/councils', { token }),
    ]);
    setChurches(c);
    setUsers(u);
    setCouncils(co);
  }, [token]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, load]);

  return { churches, councils, users, err, setErr, load, token };
}

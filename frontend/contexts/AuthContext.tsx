'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  apiFetch,
  AuthUser,
  clearAuth,
  loadStoredAuth,
  saveAuth,
  type Role,
} from '@/lib/api';

type RegisterInput = {
  email: string;
  password: string;
  churchId: string;
  conferenceIds: string[];
  memberCategory?: 'MEMBER' | 'PRESIDENT' | 'MODERATOR' | 'PASTOR';
  firstName: string;
  surname: string;
  idNumber: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';
  contactPhone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    country: string;
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = loadStoredAuth();
    if (!stored?.token) {
      setUser(null);
      setToken(null);
      return;
    }
    const me = await apiFetch<AuthUser>('/api/auth/me', {
      token: stored.token,
    });
    setUser(me);
    setToken(stored.token);
    saveAuth(stored.token, me);
  }, []);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored.token);
    setUser(stored.user);
    refreshUser()
      .catch(() => {
        clearAuth();
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    saveAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser }),
    [user, token, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case 'SUPERADMIN':
      return '/dashboard/superadmin';
    case 'ADMIN':
      return '/dashboard/admin/members';
    case 'MEMBER':
      return '/dashboard/member';
    default:
      return '/login';
  }
}

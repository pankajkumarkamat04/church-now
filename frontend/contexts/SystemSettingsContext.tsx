'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/lib/api';
import {
  DEFAULT_SYSTEM_SETTINGS,
  normalizeSystemSettings,
  type SystemSettings,
} from '@/lib/systemSettings';

type SystemSettingsContextValue = {
  settings: SystemSettings;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SystemSettingsContext = createContext<SystemSettingsContextValue | null>(null);

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/public/system-settings`, { cache: 'no-store' });
      if (!res.ok) {
        setSettings(DEFAULT_SYSTEM_SETTINGS);
        return;
      }
      const data = (await res.json()) as Partial<SystemSettings>;
      setSettings(normalizeSystemSettings(data));
    } catch {
      setSettings(DEFAULT_SYSTEM_SETTINGS);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading, refresh]);
  return <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>;
}

export function useSystemSettings(): SystemSettingsContextValue {
  const ctx = useContext(SystemSettingsContext);
  if (!ctx) throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  return ctx;
}

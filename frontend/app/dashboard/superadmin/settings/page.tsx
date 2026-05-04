'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { apiFetch, getApiBase } from '@/lib/api';
import {
  normalizeSystemSettings,
  type SystemSettings,
} from '@/lib/systemSettings';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SuperadminSystemSettingsPage() {
  const { token } = useAuth();
  const { settings, refresh } = useSystemSettings();
  const [form, setForm] = useState<SystemSettings>(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const canSave = useMemo(() => form.systemName.trim().length > 0, [form.systemName]);

  async function uploadLogoFile() {
    if (!logoFile || !token) return;
    const body = new FormData();
    body.append('file', logoFile);
    const res = await fetch(`${getApiBase()}/api/superadmin/system-settings/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (!res.ok) {
      let msg = 'Failed to upload logo';
      try {
        const err = (await res.json()) as { message?: string };
        if (err?.message) msg = err.message;
      } catch {}
      throw new Error(msg);
    }
    const next = (await res.json()) as SystemSettings;
    setForm(normalizeSystemSettings(next));
    setLogoFile(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaveState('saving');
    setMessage('');
    try {
      const payload = normalizeSystemSettings(form);
      const next = await apiFetch<SystemSettings>('/api/superadmin/system-settings', {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      });
      setForm(normalizeSystemSettings(next));
      if (logoFile) {
        await uploadLogoFile();
      }
      await refresh();
      setSaveState('saved');
      setMessage('System settings saved.');
    } catch (err) {
      setSaveState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">System settings</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Configure the system name, logo, and organization details used across auth and dashboards.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">System name *</span>
            <input
              value={form.systemName}
              onChange={(e) => setForm((prev) => ({ ...prev, systemName: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="Church OS"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">System logo image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Upload a logo image file. If none is uploaded, the system name is shown.
            </p>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Support email</span>
            <input
              value={form.supportEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="support@yourchurch.org"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Support phone</span>
            <input
              value={form.supportPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, supportPhone: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="+1 555 000 0000"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Website URL</span>
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="https://yourchurch.org"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Address</span>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="min-h-20 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="Organization address"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Footer text</span>
            <input
              value={form.footerText}
              onChange={(e) => setForm((prev) => ({ ...prev, footerText: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="Optional line shown in footer"
            />
          </label>
        </div>
        {form.systemLogoUrl ? (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">Current logo preview</p>
            <img
              src={form.systemLogoUrl}
              alt={form.systemName}
              className="h-14 w-14 rounded-md object-cover ring-1 ring-neutral-200"
            />
          </div>
        ) : null}

        {message ? (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              saveState === 'error'
                ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            }`}
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSave || saveState === 'saving'}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === 'saving' ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}

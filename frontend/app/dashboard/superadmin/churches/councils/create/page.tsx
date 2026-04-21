'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord } from '../../types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type ConferenceOption = { _id: string; name?: string; conferenceId?: string };

export default function SuperadminCouncilCreatePage() {
  function churchUpdatePath(church: ChurchRecord): string {
    return church.churchType === 'SUB'
      ? `/api/superadmin/sub-churches/${church._id}`
      : `/api/superadmin/main-churches/${church._id}`;
  }

  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<ChurchRecord[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      const rows = await apiFetch<ChurchRecord[]>('/api/superadmin/churches', { token });
      const active = rows.filter((c) => c.isActive !== false);
      setChurches(active);
      const firstConference =
        active.find((c) => c.conference && typeof c.conference === 'object' && c.conference._id)?.conference;
      const firstConferenceId =
        firstConference && typeof firstConference === 'object' ? firstConference._id : '';
      setConferenceId(firstConferenceId);
      const firstChurch = active.find((c) => {
        const conf = c.conference;
        return firstConferenceId && conf && typeof conf === 'object' && conf._id === firstConferenceId;
      });
      setChurchId(firstChurch?._id || '');
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load churches'));
  }, [token, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !churchId || !name.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      const church = churches.find((c) => c._id === churchId);
      if (!church) {
        setErr('Selected church not found');
        setBusy(false);
        return;
      }
      const existing = church?.councils || [];
      await apiFetch(churchUpdatePath(church), {
        method: 'PUT',
        token,
        body: JSON.stringify({
          councils: [...existing, { name: name.trim(), roles: [] }],
        }),
      });
      router.replace('/dashboard/superadmin/churches/councils');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create council');
    } finally {
      setBusy(false);
    }
  }

  const conferenceRows: ConferenceOption[] = churches
    .map((c) => c.conference)
    .filter(
      (conf): conf is ConferenceOption => conf !== null && typeof conf === 'object' && '_id' in conf
    );

  const conferenceOptions = Array.from(
    new Map(conferenceRows.map((conf) => [conf._id, conf])).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const conferenceChurches = churches.filter((c) => {
    const conf = c.conference;
    if (!conferenceId || !conf || typeof conf === 'string') return false;
    return conf._id === conferenceId;
  });

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/superadmin/churches/councils" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to councils
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add council</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
            <select
              required
              value={conferenceId}
              onChange={(e) => {
                const nextConferenceId = e.target.value;
                setConferenceId(nextConferenceId);
                const nextChurch = churches.find((c) => {
                  const conf = c.conference;
                  return conf && typeof conf === 'object' && conf._id === nextConferenceId;
                });
                setChurchId(nextChurch?._id || '');
              }}
              className={field}
            >
              <option value="">Select conference</option>
              {conferenceOptions.map((conf) => (
                <option key={conf._id} value={conf._id}>
                  {conf.name}
                  {conf.conferenceId ? ` (${conf.conferenceId})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
            <select
              required
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
              className={field}
              disabled={!conferenceId}
            >
              <option value="">{conferenceId ? 'Select church' : 'Select conference first'}</option>
              {conferenceChurches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Council name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Create council'}
          </button>
        </form>
      </div>
    </div>
  );
}

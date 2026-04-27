'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchMemberRef, ChurchRecord, ServiceCouncil } from '../../../types';

type Conference = { _id: string; name?: string; conferenceId?: string };

type ChurchOption = {
  _id: string;
  name: string;
  conference?: string | { _id: string } | null;
};

type UserListItem = {
  id: string;
  fullName?: string;
  email?: string;
};

export default function CreateServicePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCouncilId = (searchParams.get('councilId') || '').trim();

  const [mainChurch, setMainChurch] = useState<ChurchRecord | null>(null);
  const [councils, setCouncils] = useState<ServiceCouncil[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [members, setMembers] = useState<ChurchMemberRef[]>([]);
  const [councilId, setCouncilId] = useState(requestedCouncilId);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [headMemberId, setHeadMemberId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mainChurchId = useMemo(() => mainChurch?._id || '', [mainChurch]);
  const filteredChurches = useMemo(
    () =>
      conferenceId
        ? churches.filter((c) => {
            if (!c.conference) return false;
            if (typeof c.conference === 'string') return c.conference === conferenceId;
            return c.conference._id === conferenceId;
          })
        : [],
    [churches, conferenceId]
  );

  const loadBase = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const mains = await apiFetch<ChurchRecord[]>('/api/superadmin/main-churches', { token });
    const firstMain = mains[0] || null;
    setMainChurch(firstMain);
    if (!firstMain?._id) return;
    const [serviceCouncils, conferenceRows, churchRows] = await Promise.all([
      apiFetch<ServiceCouncil[]>(`/api/superadmin/main-churches/${firstMain._id}/service-councils`, { token }),
      apiFetch<Conference[]>('/api/superadmin/conferences', { token }),
      apiFetch<ChurchOption[]>('/api/superadmin/churches', { token }),
    ]);
    setCouncils(serviceCouncils);
    setConferences(conferenceRows);
    setChurches(churchRows);
    if (!requestedCouncilId && serviceCouncils[0]?._id) setCouncilId(serviceCouncils[0]._id);
  }, [token, requestedCouncilId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      loadBase().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load page'));
    }
  }, [user, token, loadBase]);

  useEffect(() => {
    if (!token || !churchId) {
      setMembers([]);
      return;
    }
    apiFetch<UserListItem[]>(`/api/superadmin/users?churchId=${churchId}&role=MEMBER`, { token })
      .then((rows) =>
        setMembers(
          rows.map((u) => ({
            _id: u.id,
            fullName: u.fullName,
            email: u.email,
          }))
        )
      )
      .catch(() => setMembers([]));
  }, [token, churchId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !mainChurchId || !councilId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Service name is required');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/main-churches/${mainChurchId}/service-councils/${councilId}/services`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: trimmed,
          head: headMemberId || null,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
        }),
      });
      router.replace(`/dashboard/superadmin/churches/service-councils/services?councilId=${councilId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create service');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Create Service</h1>
          <p className="mt-1 text-sm text-neutral-600">Add a service with contact details and assign its head.</p>
        </div>
        <Link
          href={councilId ? `/dashboard/superadmin/churches/service-councils/services?councilId=${councilId}` : '/dashboard/superadmin/churches/service-councils/services'}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </Link>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <form onSubmit={onCreate} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Service council</label>
          <select
            value={councilId}
            onChange={(e) => setCouncilId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select service council</option>
            {councils.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Service name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact name</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Contact email</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">Head selection</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
              <select
                value={conferenceId}
                onChange={(e) => {
                  setConferenceId(e.target.value);
                  setChurchId('');
                  setHeadMemberId('');
                  setMembers([]);
                }}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Select conference</option>
                {conferences.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.conferenceId || c._id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
              <select
                value={churchId}
                onChange={(e) => {
                  setChurchId(e.target.value);
                  setHeadMemberId('');
                }}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                disabled={!conferenceId}
              >
                <option value="">Select church</option>
                {filteredChurches.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Member (Head)</label>
              <select
                value={headMemberId}
                onChange={(e) => setHeadMemberId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                disabled={!churchId}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName || m.email || m._id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {busy ? 'Saving...' : 'Create service'}
        </button>
      </form>
    </div>
  );
}

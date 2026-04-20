'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type Conference = { _id: string; name: string; conferenceId?: string };
type Church = { _id: string; name: string; conference?: string | { _id: string } | null };

export default function SuperadminMemberCreatePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [memberCategory, setMemberCategory] = useState<'MEMBER' | 'PRESIDENT' | 'MODERATOR'>('MEMBER');
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadReferences() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      const [conferenceRows, churchRows] = await Promise.all([
        apiFetch<Conference[]>('/api/superadmin/conferences', { token }),
        apiFetch<Church[]>('/api/superadmin/sub-churches', { token }),
      ]);
      setConferences(conferenceRows);
      setChurches(churchRows);
      if (conferenceRows.length > 0) setConferenceId(conferenceRows[0]._id);
    }
    loadReferences().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load references'));
  }, [token, user]);

  const filteredChurches = useMemo(
    () =>
      churches.filter((church) => {
        const conf = church.conference;
        if (!conferenceId || !conf) return false;
        return typeof conf === 'string' ? conf === conferenceId : conf._id === conferenceId;
      }),
    [churches, conferenceId]
  );

  useEffect(() => {
    setChurchId((prev) => (prev && filteredChurches.some((church) => church._id === prev) ? prev : filteredChurches[0]?._id || ''));
  }, [filteredChurches]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/superadmin/members', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          firstName,
          surname,
          idNumber,
          contactPhone,
          conferenceId,
          churchId,
          memberCategory,
        }),
      });
      router.replace('/dashboard/superadmin/users');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create member');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/superadmin/users" className="text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to members
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add member</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Conference</label>
              <select required value={conferenceId} onChange={(e) => setConferenceId(e.target.value)} className={field}>
                <option value="">Select conference</option>
                {conferences.map((conference) => (
                  <option key={conference._id} value={conference._id}>
                    {conference.name}
                    {conference.conferenceId ? ` (${conference.conferenceId})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Church</label>
              <select required value={churchId} onChange={(e) => setChurchId(e.target.value)} className={field}>
                <option value="">Select church</option>
                {filteredChurches.map((church) => (
                  <option key={church._id} value={church._id}>
                    {church.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Surname</label>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Member role option</label>
              <select
                value={memberCategory}
                onChange={(e) => setMemberCategory(e.target.value as 'MEMBER' | 'PRESIDENT' | 'MODERATOR')}
                className={field}
              >
                <option value="MEMBER">Member</option>
                <option value="PRESIDENT">President</option>
                <option value="MODERATOR">Moderator</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">ID Number</label>
              <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Contact phone</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Password</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={field} />
            </div>
          </div>
          {err ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create member
            </button>
            <Link href="/dashboard/superadmin/users" className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

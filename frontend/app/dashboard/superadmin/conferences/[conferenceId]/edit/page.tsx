'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type UserOption = { id?: string; _id?: string; fullName?: string; email?: string };
type Conference = {
  _id: string;
  conferenceId?: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  contactPerson?: string;
  isActive: boolean;
  leadership?: {
    churchBishop?: UserOption | string | null;
    moderator?: UserOption | string | null;
    secretary?: UserOption | string | null;
    treasurer?: UserOption | string | null;
    president?: UserOption | string | null;
    superintendents?: Array<UserOption | string>;
  };
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

export default function SuperadminConferenceEditPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conferenceId = params.conferenceId as string;
  const [conference, setConference] = useState<Conference | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [step, setStep] = useState(1);
  const [churchBishop, setChurchBishop] = useState('');
  const [moderator, setModerator] = useState('');
  const [secretary, setSecretary] = useState('');
  const [treasurer, setTreasurer] = useState('');
  const [superintendents, setSuperintendents] = useState<string[]>([]);
  const [president, setPresident] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickId(v: UserOption | string | null | undefined): string {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return String(v.id || v._id || '');
  }

  async function loadConference() {
    if (!token || !conferenceId) return;
    const row = await apiFetch<Conference>(`/api/superadmin/conferences/${conferenceId}`, { token });
    setConference(row);
    setName(row.name || '');
    setDescription(row.description || '');
    setEmail(row.email || '');
    setPhone(row.phone || '');
    setWebsite(row.website || '');
    setContactPerson(row.contactPerson || '');
    setChurchBishop(pickId(row.leadership?.churchBishop));
    setModerator(pickId(row.leadership?.moderator));
    setSecretary(pickId(row.leadership?.secretary));
    setTreasurer(pickId(row.leadership?.treasurer));
    setPresident(pickId(row.leadership?.president));
    setSuperintendents(Array.isArray(row.leadership?.superintendents) ? row.leadership!.superintendents!.map((x) => pickId(x)).filter(Boolean) : []);
    setIsActive(row.isActive !== false);
  }

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function loadUsers() {
      if (!token || !user || user.role !== 'SUPERADMIN') return;
      try {
        const rows = await apiFetch<UserOption[]>('/api/superadmin/users', { token });
        setUsers(rows);
      } catch {
        // ignore
      }
    }
    loadUsers();
  }, [token, user]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && conferenceId) {
      loadConference().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'));
    }
  }, [user, token, conferenceId]);

  async function saveConference(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/conferences/${conferenceId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: name.trim(),
          description,
          email,
          phone,
          website,
          contactPerson,
          leadership: {
            churchBishop: churchBishop || null,
            moderator: moderator || null,
            secretary: secretary || null,
            treasurer: treasurer || null,
            president: president || null,
            superintendents,
          },
          isActive,
        }),
      });
      await loadConference();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save conference');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (!conference) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/conferences" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to conferences
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Conference</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Edit conference</h1>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={saveConference}>
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <span className={step === 1 ? 'text-violet-700' : ''}>Step 1: Basic</span>
              <span>•</span>
              <span className={step === 2 ? 'text-violet-700' : ''}>Step 2: Contact</span>
              <span>•</span>
              <span className={step === 3 ? 'text-violet-700' : ''}>Step 3: Leadership</span>
              <span>•</span>
              <span className={step === 4 ? 'text-violet-700' : ''}>Step 4: Confirm</span>
            </div>

            {step === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={field} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Conference ID</label>
                  <div
                    className={`${field} cursor-default bg-neutral-50 text-neutral-700`}
                    title="Conference ID cannot be changed"
                  >
                    {conference.conferenceId || '—'}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">Set when the conference was created; it cannot be edited.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} min-h-[90px]`} />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="Email" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="Phone" />
                <input value={website} onChange={(e) => setWebsite(e.target.value)} className={field} placeholder="Website" />
                <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={field} placeholder="Contact person" />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <select value={churchBishop} onChange={(e) => setChurchBishop(e.target.value)} className={field}>
                  <option value="">Church Bishop</option>
                  {users.map((u) => {
                    const id = pickId(u);
                    return <option key={id} value={id}>{u.fullName || u.email || id}</option>;
                  })}
                </select>
                <select value={moderator} onChange={(e) => setModerator(e.target.value)} className={field}>
                  <option value="">Moderator</option>
                  {users.map((u) => {
                    const id = pickId(u);
                    return <option key={id} value={id}>{u.fullName || u.email || id}</option>;
                  })}
                </select>
                <select value={secretary} onChange={(e) => setSecretary(e.target.value)} className={field}>
                  <option value="">Secretary</option>
                  {users.map((u) => {
                    const id = pickId(u);
                    return <option key={id} value={id}>{u.fullName || u.email || id}</option>;
                  })}
                </select>
                <select value={treasurer} onChange={(e) => setTreasurer(e.target.value)} className={field}>
                  <option value="">Treasurer</option>
                  {users.map((u) => {
                    const id = pickId(u);
                    return <option key={id} value={id}>{u.fullName || u.email || id}</option>;
                  })}
                </select>
                <select value={president} onChange={(e) => setPresident(e.target.value)} className={field}>
                  <option value="">President</option>
                  {users.map((u) => {
                    const id = pickId(u);
                    return <option key={id} value={id}>{u.fullName || u.email || id}</option>;
                  })}
                </select>
                <select
                  multiple
                  value={superintendents}
                  onChange={(e) => setSuperintendents(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                  className={`${field} min-h-[110px]`}
                >
                  {users.map((u) => {
                    const id = pickId(u);
                    return <option key={id} value={id}>{u.fullName || u.email || id}</option>;
                  })}
                </select>
              </div>
            ) : null}

            {step === 4 ? (
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 rounded border-neutral-300" />
                Active
              </label>
            ) : null}

            <div className="flex gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Back
                </button>
              ) : null}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !name.trim()) {
                      setErr('Conference name is required');
                      return;
                    }
                    setErr(null);
                    setStep((s) => s + 1);
                  }}
                  className="inline-flex items-center rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500"
                >
                  Next
                </button>
              ) : (
                <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save conference
                </button>
              )}
            </div>
          </form>
      </div>
    </div>
  );
}

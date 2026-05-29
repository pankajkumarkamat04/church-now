'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { pastorTermCycleLabel, pastorTermLengthLabel } from '@/lib/pastorTerms';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type PastorDetail = {
  _id: string; isActive?: boolean; currentRole?: string;
  church?: { _id?: string; name?: string; churchType?: string };
  member?: {
    _id?: string; fullName?: string; firstName?: string; surname?: string;
    email?: string; memberId?: string; contactPhone?: string;
    role?: string; memberCategory?: string; isActive?: boolean;
    adminChurches?: string[];
  };
  personal?: {
    name?: string; fullName?: string; title?: string;
    contactEmail?: string; email?: string; contactPhone?: string;
    dateOfBirth?: string; gender?: string; address?: string; addressText?: string;
  };
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
};

type PastorTerm = {
  _id: string; status: string; termNumber: number; termLengthYears?: number;
  termStart: string; termEnd: string;
  church?: { _id?: string; name?: string };
  transferredToChurch?: { _id?: string; name?: string };
  /** User id of the assigned pastor (ref: User); populated in list APIs */
  pastor?: { _id?: string; fullName?: string; email?: string; memberId?: string } | string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const field = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

const STATUS_BADGE: Record<string, string> = {
  ASSIGNED: 'bg-emerald-100 text-emerald-800',
  RENEWED: 'bg-sky-100 text-sky-800',
  TRANSFER_REQUIRED: 'bg-amber-100 text-amber-800',
  TRANSFERRED: 'bg-neutral-100 text-neutral-600',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperadminPastorDetailPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;

  const [pastor, setPastor] = useState<PastorDetail | null>(null);
  const [terms, setTerms] = useState<PastorTerm[]>([]);
  const [churches, setChurches] = useState<{ _id: string; name: string }[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(''); const [title, setTitle] = useState('');
  const [contactEmail, setContactEmail] = useState(''); const [contactPhone, setContactPhone] = useState('');
  const [dob, setDob] = useState(''); const [gender, setGender] = useState('');
  const [address, setAddress] = useState(''); const [currentRole, setCurrentRole] = useState('');
  const [denomination, setDenomination] = useState(''); const [ordinationDate, setOrdinationDate] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Transfer state
  const [transferToChurchId, setTransferToChurchId] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!recordId) return;
    if (
      recordId.startsWith('term_') ||
      recordId.startsWith('leadership_') ||
      recordId.startsWith('category_')
    ) {
      router.replace('/dashboard/superadmin/pastor-management?tab=terms');
    }
  }, [recordId, router]);

  async function load() {
    if (!token || !recordId || user?.role !== 'SUPERADMIN') return;
    if (
      recordId.startsWith('term_') ||
      recordId.startsWith('leadership_') ||
      recordId.startsWith('category_')
    ) {
      return;
    }
    setPageLoading(true);
    try {
      const [rec, termRes, churchRes] = await Promise.all([
        apiFetch<PastorDetail>(`/api/superadmin/pastors/${recordId}`, { token }),
        apiFetch<PastorTerm[] | Paginated<PastorTerm>>('/api/superadmin/pastor-terms?limit=200', { token }),
        apiFetch<{ _id: string; name: string }[] | Paginated<{ _id: string; name: string }>>('/api/superadmin/churches?limit=500', { token }),
      ]);
      const termRows = unwrapPaginatedArray(termRes);
      const churchRows = unwrapPaginatedArray(churchRes);
      setPastor(rec);
      const memberId = typeof rec.member === 'object' && rec.member ? rec.member._id : '';
      const termPastorId = (t: PastorTerm) => {
        const p = t.pastor;
        if (p == null || p === '') return '';
        return typeof p === 'object' ? String(p._id ?? '') : String(p);
      };
      setTerms(termRows.filter((t) => memberId && termPastorId(t) === memberId));
      setChurches(churchRows);

      // Prefill edit fields
      setName(rec.personal?.name || rec.personal?.fullName || '');
      setTitle(rec.personal?.title || '');
      setContactEmail(rec.personal?.contactEmail || rec.personal?.email || '');
      setContactPhone(rec.personal?.contactPhone || '');
      setGender(rec.personal?.gender || '');
      setAddress(rec.personal?.address || rec.personal?.addressText || '');
      setCurrentRole(rec.currentRole || '');
      setDenomination(rec.credentials?.denomination || '');
      setQualifications((rec.credentials?.qualifications || []).join(', '));
      if (rec.personal?.dateOfBirth) {
        const d = new Date(rec.personal.dateOfBirth);
        if (!isNaN(d.getTime())) setDob(d.toISOString().slice(0, 10));
      }
      if (rec.credentials?.ordinationDate) {
        const d = new Date(rec.credentials.ordinationDate);
        if (!isNaN(d.getTime())) setOrdinationDate(d.toISOString().slice(0, 10));
      }
    } catch (e) { setPageErr(e instanceof Error ? e.message : 'Failed to load pastor'); }
    finally { setPageLoading(false); }
  }

  useEffect(() => { void load(); }, [token, recordId, user]); // eslint-disable-line

  async function saveEdit() {
    if (!token || !pastor) return;
    setSaving(true); setSaveErr(null); setSaveMsg(null);
    try {
      const updated = await apiFetch<PastorDetail>(`/api/superadmin/pastors/${recordId}`, {
        method: 'PUT', token,
        body: JSON.stringify({
          name: name || undefined, title: title || undefined,
          contactEmail: contactEmail || undefined, contactPhone: contactPhone || undefined,
          dateOfBirth: dob || null, gender: gender || undefined, address: address || undefined,
          currentRole: currentRole || undefined,
          credentials: {
            ordinationDate: ordinationDate || null, denomination,
            qualifications: qualifications.split(',').map((x) => x.trim()).filter(Boolean),
          },
        }),
      });
      setPastor(updated);
      setEditing(false);
      setSaveMsg('Changes saved successfully.');
    } catch (e) { setSaveErr(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  }

  async function toggleActive() {
    if (!token || !pastor) return;
    setBusyAction('toggle'); setActionErr(null); setActionMsg(null);
    try {
      const res = await apiFetch<{ isActive: boolean }>(`/api/superadmin/pastors/${recordId}/toggle-active`, { method: 'POST', token });
      setPastor((p) => p ? { ...p, isActive: res.isActive } : p);
      setActionMsg(res.isActive ? 'Pastor activated.' : 'Pastor deactivated.');
    } catch (e) { setActionErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyAction(null); }
  }

  async function grantAdmin() {
    const memberId = pastor?.member?._id;
    if (!token || !memberId || !confirm('Grant ADMIN access? The pastor will be able to log in as church admin.')) return;
    setBusyAction('grant'); setActionErr(null); setActionMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${memberId}/grant-admin`, { method: 'POST', token });
      await load();
      setActionMsg('Admin access granted successfully.');
    } catch (e) { setActionErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyAction(null); }
  }

  async function revokeAdmin() {
    const memberId = pastor?.member?._id;
    if (!token || !memberId || !confirm('Revoke admin access? The pastor will return to MEMBER role.')) return;
    setBusyAction('revoke'); setActionErr(null); setActionMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${memberId}/revoke-admin`, { method: 'POST', token });
      await load();
      setActionMsg('Admin access revoked.');
    } catch (e) { setActionErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyAction(null); }
  }

  async function upgradeToPastor() {
    const memberId = pastor?.member?._id;
    if (!token || !memberId || !confirm('Upgrade this member to PASTOR category?')) return;
    setBusyAction('upgrade'); setActionErr(null); setActionMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${memberId}/upgrade-to-pastor`, { method: 'POST', token });
      await load();
      setActionMsg('Member upgraded to PASTOR category.');
    } catch (e) { setActionErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyAction(null); }
  }

  async function deleteRecord() {
    if (!token || !confirm('Delete this pastor record permanently? This cannot be undone.')) return;
    setBusyAction('delete'); setActionErr(null);
    try {
      await apiFetch(`/api/superadmin/pastors/${recordId}`, { method: 'DELETE', token });
      router.push('/dashboard/superadmin/pastor-management');
    } catch (e) { setActionErr(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setBusyAction(null); }
  }

  async function transferFromTerm(termId: string) {
    if (!token || !transferToChurchId) return;
    setBusyAction('transfer-' + termId); setActionErr(null); setActionMsg(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${termId}/transfer`, {
        method: 'POST', token,
        body: JSON.stringify({ toChurchId: transferToChurchId }),
      });
      setTransferToChurchId('');
      await load();
      setActionMsg('Pastor transferred successfully. Church membership updated.');
    } catch (e) { setActionErr(e instanceof Error ? e.message : 'Failed to transfer'); }
    finally { setBusyAction(null); }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-violet-600" />
      </div>
    );
  }

  if (pageErr || !pastor) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/superadmin/pastor-management" className="text-sm text-violet-600 hover:underline">← Back to Pastor Management</Link>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageErr || 'Pastor not found.'}</p>
      </div>
    );
  }

  const mem = pastor.member;
  const displayName = pastor.personal?.name || pastor.personal?.fullName || mem?.fullName || '—';
  const isAdmin = mem?.role === 'ADMIN';
  const isPastorCat = mem?.memberCategory === 'PASTOR';
  const activeTerm = terms.find((t) => ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'].includes(t.status));
  const currentChurchId = typeof pastor.church === 'object' && pastor.church ? pastor.church._id || '' : '';

  return (
    <div className="dashboard-page w-full min-w-0 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/superadmin/pastor-management" className="text-violet-600 hover:underline dark:text-violet-400">Pastor Management</Link>
        <span className="text-neutral-400">/</span>
        <span className="text-neutral-600 dark:text-neutral-400">{displayName}</span>
      </div>

      {/* Profile header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start rounded-2xl border border-violet-100 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-violet-900/40">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 text-3xl font-bold dark:bg-violet-900/40 dark:text-violet-300">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{displayName}</h1>
            {pastor.isActive === false
              ? <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800">Inactive</span>
              : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Active</span>}
            {isAdmin && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">Admin Access</span>}
            {isPastorCat && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Pastor Category</span>}
          </div>
          {pastor.personal?.title && <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{pastor.personal.title}</p>}
          <p className="mt-1 text-sm font-medium text-violet-700 dark:text-violet-400">
            {typeof pastor.church === 'object' && pastor.church ? pastor.church.name : '—'}
          </p>
          {pastor.currentRole && <p className="text-xs text-neutral-500 dark:text-neutral-400">{pastor.currentRole}</p>}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
          <button type="button" onClick={() => { setEditing(true); setSaveErr(null); setSaveMsg(null); }}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Edit Profile
          </button>
          <button type="button" disabled={busyAction === 'toggle'} onClick={() => void toggleActive()}
            className={`rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${pastor.isActive === false ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400'}`}>
            {pastor.isActive === false ? 'Activate' : 'Deactivate'}
          </button>
          <button type="button" disabled={busyAction === 'delete'} onClick={() => void deleteRecord()}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400">
            Delete Record
          </button>
        </div>
      </div>

      {(actionErr || actionMsg || saveMsg) && (
        <div className={`rounded-lg border px-4 py-2 text-sm ${actionErr ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {actionErr || actionMsg || saveMsg}
        </div>
      )}

      {/* Grid: info + actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: personal + credentials */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal Info */}
          <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Personal Information</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 text-sm">
              {[
                { label: 'Full Name', value: displayName },
                { label: 'Title', value: pastor.personal?.title || '—' },
                { label: 'Contact Email', value: pastor.personal?.contactEmail || pastor.personal?.email || '—' },
                { label: 'Contact Phone', value: pastor.personal?.contactPhone || '—' },
                { label: 'Date of Birth', value: fmtDate(pastor.personal?.dateOfBirth) },
                { label: 'Gender', value: pastor.personal?.gender || '—' },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">{row.label}</dt>
                  <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{row.value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Address</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{pastor.personal?.address || pastor.personal?.addressText || '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Credentials */}
          <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Credentials & Ministry</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 text-sm">
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Ordination Date</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{fmtDate(pastor.credentials?.ordinationDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Denomination</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{pastor.credentials?.denomination || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Current Role</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{pastor.currentRole || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Qualifications</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">
                  {(pastor.credentials?.qualifications || []).length > 0
                    ? (pastor.credentials?.qualifications || []).map((q) => (
                        <span key={q} className="mr-1.5 mb-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{q}</span>
                      ))
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Term History */}
          {terms.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
              <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assignment / Term History</h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {terms.map((t) => {
                  const tChurchName = typeof t.church === 'object' && t.church ? t.church.name || '—' : '—';
                  const tChurchId = typeof t.church === 'object' && t.church ? t.church._id || '' : '';
                  return (
                    <div key={t._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{tChurchName}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {pastorTermCycleLabel(t.termNumber, t.termLengthYears)} · {pastorTermLengthLabel(t.termLengthYears)} · {fmtDate(t.termStart)} – {fmtDate(t.termEnd)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] || 'bg-neutral-100 text-neutral-600'}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                        {t.status !== 'TRANSFERRED' && (
                          <div className="flex gap-2">
                            <select
                              value={transferToChurchId}
                              onChange={(e) => setTransferToChurchId(e.target.value)}
                              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300"
                            >
                              <option value="">Transfer to…</option>
                              {churches.filter((c) => c._id !== tChurchId).map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                            <button type="button"
                              disabled={busyAction === 'transfer-' + t._id || !transferToChurchId}
                              onClick={() => void transferFromTerm(t._id)}
                              className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40 dark:border-amber-700 dark:text-amber-300"
                            >
                              {busyAction === 'transfer-' + t._id ? '…' : 'Transfer'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right: Member info + Access management */}
        <div className="space-y-6">
          {/* Member Account */}
          <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Linked Member Account</h2>
            </div>
            <dl className="space-y-3 px-5 py-4 text-sm">
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Name</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{mem?.fullName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Email</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100 break-all">{mem?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Member ID</dt>
                <dd className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{mem?.memberId || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">System Role</dt>
                <dd className="mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${mem?.role === 'ADMIN' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                    {mem?.role || '—'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Member Category</dt>
                <dd className="mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${mem?.memberCategory === 'PASTOR' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                    {mem?.memberCategory || 'MEMBER'}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Access Management */}
          <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Access Management</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              {!isPastorCat && (
                <button type="button" disabled={busyAction === 'upgrade'} onClick={() => void upgradeToPastor()}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500 disabled:opacity-50">
                  {busyAction === 'upgrade' ? 'Upgrading…' : 'Upgrade to Pastor Category'}
                </button>
              )}
              {!isAdmin ? (
                <button type="button" disabled={busyAction === 'grant'} onClick={() => void grantAdmin()}
                  className="w-full rounded-lg border border-sky-300 px-4 py-2.5 font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-700 dark:text-sky-400">
                  {busyAction === 'grant' ? 'Granting…' : 'Grant Admin Access'}
                </button>
              ) : (
                <button type="button" disabled={busyAction === 'revoke'} onClick={() => void revokeAdmin()}
                  className="w-full rounded-lg border border-red-200 px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400">
                  {busyAction === 'revoke' ? 'Revoking…' : 'Revoke Admin Access'}
                </button>
              )}
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Pastors can only be granted ADMIN access — SUPERADMIN is not available.</p>
            </div>
          </section>

          {/* Church assignment */}
          <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Current Church</h2>
            </div>
            <div className="px-5 py-4 text-sm">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {typeof pastor.church === 'object' && pastor.church ? pastor.church.name : '—'}
              </p>
              {activeTerm && (
                <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  <p>Active term: {fmtDate(activeTerm.termStart)} – {fmtDate(activeTerm.termEnd)}</p>
                  <p>{pastorTermCycleLabel(activeTerm.termNumber, activeTerm.termLengthYears)} · {pastorTermLengthLabel(activeTerm.termLengthYears)} · <span className={`font-medium ${activeTerm.status === 'TRANSFER_REQUIRED' ? 'text-amber-600' : 'text-emerald-600'}`}>{activeTerm.status.replace('_', ' ')}</span></p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:bg-neutral-900 dark:border-neutral-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Edit Pastor Profile</h2>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">✕</button>
            </div>
            {saveErr && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveErr}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Full Name', value: name, set: setName, ph: 'Full name' },
                { label: 'Title', value: title, set: setTitle, ph: 'Pastor, Reverend, Dr., …' },
                { label: 'Contact Email', value: contactEmail, set: setContactEmail, ph: 'Email', type: 'email' },
                { label: 'Contact Phone', value: contactPhone, set: setContactPhone, ph: 'Phone' },
                { label: 'Gender', value: gender, set: setGender, ph: 'Gender' },
                { label: 'Current Role', value: currentRole, set: setCurrentRole, ph: 'e.g. Lead Pastor' },
                { label: 'Denomination', value: denomination, set: setDenomination, ph: 'Denomination' },
                { label: 'Qualifications', value: qualifications, set: setQualifications, ph: 'Comma-separated' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{f.label}</label>
                  <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.ph} type={(f as { type?: string }).type || 'text'} className={field} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Date of Birth</label>
                <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" className={field} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Ordination Date</label>
                <input value={ordinationDate} onChange={(e) => setOrdinationDate(e.target.value)} type="date" className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={field} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void saveEdit()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

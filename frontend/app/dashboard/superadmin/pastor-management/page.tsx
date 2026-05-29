'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, type Paginated, unwrapPaginatedArray } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PastorAssignModal } from '@/components/church/PastorAssignModal';
import { MainChurchPastorTab } from '@/components/church/MainChurchPastorTab';
import { SubChurchPastorsTab } from '@/components/church/SubChurchPastorsTab';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { DashboardPageShell } from '@/components/layout/DashboardPageShell';
import { DashboardTabs } from '@/components/layout/DashboardTabs';
import { toolbarControl, toolbarRow } from '@/lib/responsiveClasses';
import { canAccessSuperadminPanel } from '@/lib/superadminPanel';
import {
  excludeMainChurchRows,
  pastorMainLeaderBadgeClass,
  pastorPoolBadgeClass,
  subChurchesOnly,
} from '@/lib/pastorManagement';
import {
  RemoveSpiritualLeaderModal,
  type SpiritualLeaderRemoveTarget,
} from '@/components/church/RemoveSpiritualLeaderModal';
import {
  UpgradeSpiritualLeaderModal,
  type UpgradeSpiritualLeaderTarget,
} from '@/components/church/UpgradeSpiritualLeaderModal';
import type { PastorTermLengthYears } from '@/lib/pastorTerms';
import {
  MAX_PASTOR_TERM_CYCLES,
  pastorTermCycleLabel,
  pastorTermLengthLabel,
} from '@/lib/pastorTerms';

const PASTOR_PAGE_DEFAULT = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

type ChurchMemberRef = {
  _id?: string;
  fullName?: string;
  email?: string;
  memberId?: string;
};

type ChurchOption = {
  _id: string;
  name: string;
  churchType?: 'MAIN' | 'SUB';
  localLeadership?: {
    spiritualPastor?: ChurchMemberRef | string | null;
  };
};
type MemberAddress = { line1?: string; line2?: string; city?: string; stateOrProvince?: string; postalCode?: string; country?: string };
type MemberOption = {
  _id: string; fullName?: string; email?: string; memberId?: string;
  contactPhone?: string; address?: MemberAddress; dateOfBirth?: string;
  gender?: string; role?: string; memberCategory?: string;
};
type PastorRecord = {
  _id: string; isActive?: boolean; currentRole?: string;
  _termOnly?: boolean; _termId?: string; _categoryOnly?: boolean;
  church?: { _id?: string; name?: string; churchType?: string } | string;
  member?: { _id?: string; fullName?: string; email?: string; memberId?: string; role?: string; memberCategory?: string; adminChurches?: string[] };
  personal?: { name?: string; fullName?: string; title?: string; contactEmail?: string; email?: string; contactPhone?: string; dateOfBirth?: string; gender?: string; address?: string };
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
};
type PastorTerm = {
  _id: string;
  _leadershipOnly?: boolean;
  _categoryOnly?: boolean;
  status: 'ASSIGNED' | 'RENEWED' | 'TRANSFER_REQUIRED' | 'TRANSFERRED' | 'LEADERSHIP_ONLY' | 'CATEGORY_ONLY';
  termNumber: number;
  termLengthYears?: number | null;
  termStart?: string | null;
  termEnd?: string | null;
  church?: { _id?: string; name?: string } | string;
  pastor?: { _id?: string; fullName?: string; email?: string; memberId?: string };
  transferredToChurch?: { _id?: string; name?: string } | string;
};

function isLeadershipOnlyRow(row: PastorTerm): boolean {
  return Boolean(row._leadershipOnly) || row.status === 'LEADERSHIP_ONLY';
}

function isCategoryOnlyRow(row: PastorTerm): boolean {
  return Boolean(row._categoryOnly) || row.status === 'CATEGORY_ONLY';
}

function buildRemoveTarget(t: PastorTerm, churches: ChurchOption[]): SpiritualLeaderRemoveTarget {
  return {
    id: t._id,
    leadershipOnly: isLeadershipOnlyRow(t) || isCategoryOnlyRow(t),
    churchId: churchIdFromRef(t.church, churches),
    churchName: churchNameFromRef(t.church, churches),
    pastorName: t.pastor?.fullName || t.pastor?.email || '—',
    pastorEmail: t.pastor?.email,
    memberId: t.pastor?.memberId,
    termNumber: t.termNumber,
    termLengthYears: t.termLengthYears,
    termStart: t.termStart ?? null,
    termEnd: t.termEnd ?? null,
    status: t.status,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const field = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

function addrStr(a?: MemberAddress | null): string {
  if (!a) return '';
  return [a.line1, a.line2, a.city, a.stateOrProvince, a.postalCode, a.country].filter(Boolean).join(', ');
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
function pastorName(r: PastorRecord) {
  return r.personal?.name || r.personal?.fullName || (typeof r.member === 'object' && r.member ? r.member.fullName : '') || '—';
}
function churchIdFromRef(
  church?: { _id?: string; name?: string } | string | null,
  churches?: ChurchOption[]
): string {
  if (!church) return '';
  if (typeof church === 'string') return church;
  if (church._id) return String(church._id);
  return '';
}

function churchNameFromRef(
  church?: { _id?: string; name?: string } | string | null,
  churches?: ChurchOption[]
): string {
  if (!church) return '—';
  if (typeof church === 'object' && church.name) return church.name;
  const id = churchIdFromRef(church, churches);
  if (id && churches?.length) {
    return churches.find((c) => c._id === id)?.name || '—';
  }
  return '—';
}

function churchName(r: PastorRecord | PastorTerm) {
  return churchNameFromRef(r.church);
}
function churchId(r: PastorRecord | PastorTerm): string {
  return churchIdFromRef(r.church);
}

function spiritualPastorRef(church: ChurchOption): ChurchMemberRef | null {
  const sp = church.localLeadership?.spiritualPastor;
  if (!sp || typeof sp === 'string') {
    return sp ? { _id: sp } : null;
  }
  return sp._id ? sp : null;
}

const ACTIVE_TERM_STATUSES = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'] as const;
function isWithinRenewWindow(termEnd: string): boolean {
  const end = new Date(termEnd);
  if (isNaN(end.getTime())) return false;
  const windowStart = new Date(end);
  windowStart.setMonth(windowStart.getMonth() - 1);
  const now = new Date();
  return now >= windowStart && now <= end;
}

const STATUS_BADGE: Record<string, string> = {
  ASSIGNED: 'bg-emerald-100 text-emerald-800',
  RENEWED: 'bg-sky-100 text-sky-800',
  TRANSFER_REQUIRED: 'bg-amber-100 text-amber-800',
  TRANSFERRED: 'bg-neutral-100 text-neutral-600',
  LEADERSHIP_ONLY: pastorMainLeaderBadgeClass,
  CATEGORY_ONLY: 'bg-violet-100 text-violet-900',
};

type Tab = 'directory' | 'upgrade' | 'main-pastor' | 'terms' | 'remove';

function parseTabParam(value: string | null): Tab {
  if (!value) return 'directory';
  const v = value.toLowerCase();
  if (
    v === 'main-pastor' ||
    v === 'main-church-pastor' ||
    v === 'main-church' ||
    v === 'mainchurch'
  ) {
    return 'main-pastor';
  }
  if (v === 'terms' || v === 'pastor-terms' || v === 'leader-terms' || v === 'spiritual-leaders') return 'terms';
  if (v === 'upgrade' || v === 'upgrade-member') return 'upgrade';
  if (v === 'remove' || v === 'remove-leader' || v === 'remove-spiritual-leader') return 'remove';
  if (v === 'directory') return 'directory';
  return 'directory';
}

function removableLeaders(terms: PastorTerm[]): PastorTerm[] {
  return terms.filter(
    (t) => isLeadershipOnlyRow(t) || isCategoryOnlyRow(t) || t.status !== 'TRANSFERRED'
  );
}

// ── Tab: Directory ─────────────────────────────────────────────────────────────

function DirectoryTab({
  records, churches, selectedChurchId, setSelectedChurchId, token, onRefresh,
}: {
  records: PastorRecord[]; churches: ChurchOption[];
  selectedChurchId: string; setSelectedChurchId: (v: string) => void;
  token: string | null; onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PASTOR_PAGE_DEFAULT);

  const filtered = useMemo(() => {
    let rows = records;
    if (selectedChurchId) rows = rows.filter((r) => churchId(r) === selectedChurchId);
    if (statusFilter === 'active') rows = rows.filter((r) => r.isActive !== false);
    if (statusFilter === 'inactive') rows = rows.filter((r) => r.isActive === false);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        pastorName(r).toLowerCase().includes(q) ||
        churchName(r).toLowerCase().includes(q) ||
        (r.personal?.contactEmail || '').toLowerCase().includes(q) ||
        (r.currentRole || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [records, selectedChurchId, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  async function toggleActive(recordId: string) {
    if (!token) return;
    setBusy(recordId); setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastors/${recordId}/toggle-active`, { method: 'POST', token });
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function deleteRecord(recordId: string) {
    if (!token || !confirm('Delete this pastor record? This cannot be undone.')) return;
    setBusy(recordId); setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastors/${recordId}`, { method: 'DELETE', token });
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}

      {/* Filters */}
      <div className={toolbarRow}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, church, role…"
          className={`${toolbarControl} min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100`}
        />
        <select value={selectedChurchId} onChange={(e) => { setSelectedChurchId(e.target.value); setPage(1); }} className={`${toolbarControl} sm:max-w-xs ${field}`}>
          <option value="">All sub-churches</option>
          {churches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className={`${toolbarControl} sm:max-w-[9rem] ${field}`}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: records.length, color: 'text-violet-700' },
          { label: 'Active', value: records.filter((r) => r.isActive !== false).length, color: 'text-emerald-700' },
          { label: 'Inactive', value: records.filter((r) => r.isActive === false).length, color: 'text-neutral-500' },
          { label: 'With Admin Access', value: records.filter((r) => typeof r.member === 'object' && r.member?.role === 'ADMIN').length, color: 'text-sky-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pastor cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {paged.map((r) => {
          const mem = typeof r.member === 'object' ? r.member : null;
          const isAdmin = mem?.role === 'ADMIN';
          const isPastorCat = mem?.memberCategory === 'PASTOR';
          const isTermOnly = Boolean(r._termOnly);
          const isCategoryOnly = Boolean(r._categoryOnly);
          const isSynthetic = isTermOnly || isCategoryOnly;
          return (
            <div key={r._id} className={`relative flex flex-col rounded-2xl border bg-white shadow-sm dark:bg-neutral-900 ${isSynthetic ? 'border-amber-200 dark:border-amber-800/40' : r.isActive === false ? 'border-neutral-200 opacity-60 dark:border-neutral-800' : 'border-violet-100 dark:border-violet-900/40'}`}>
              {isTermOnly && (
                <div className="rounded-t-2xl bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>⚡</span> Term Assigned — No Profile Record
                </div>
              )}
              {isCategoryOnly && (
                <div className="rounded-t-2xl bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>✓</span> Upgraded Pastor — No Profile Record
                </div>
              )}
              <div className="flex items-start gap-3 p-4">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${isSynthetic ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'}`}>
                  {pastorName(r).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{pastorName(r)}</p>
                    {r.isActive === false && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">Inactive</span>}
                    {isAdmin && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">Admin</span>}
                    {isPastorCat && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Pastor</span>}
                  </div>
                  {r.personal?.title && <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.personal.title}</p>}
                  <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-400">{churchName(r)}</p>
                </div>
              </div>
              <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                {r.currentRole && <p><span className="font-medium">Role:</span> {r.currentRole}</p>}
                {r.personal?.contactEmail && <p className="truncate"><span className="font-medium">Email:</span> {r.personal.contactEmail}</p>}
                {r.personal?.contactPhone && <p><span className="font-medium">Phone:</span> {r.personal.contactPhone}</p>}
                {isSynthetic && (
                  <p className="text-amber-600 dark:text-amber-400">
                    No detailed profile yet.{' '}
                    <Link
                      href={`/dashboard/superadmin/pastors${churchId(r) ? `?churchId=${encodeURIComponent(churchId(r))}` : ''}`}
                      className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-200"
                    >
                      Create one in Record keeping
                    </Link>
                    .
                  </p>
                )}
                {!isSynthetic && r.credentials?.denomination && <p><span className="font-medium">Denomination:</span> {r.credentials.denomination}</p>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
                {isSynthetic ? (
                  <Link
                    href={`/dashboard/superadmin/pastors${churchId(r) ? `?churchId=${encodeURIComponent(churchId(r))}` : ''}`}
                    className="flex-1 rounded-lg bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                  >
                    Create profile (Record keeping)
                  </Link>
                ) : (
                  <>
                    <Link href={`/dashboard/superadmin/pastor-management/${r._id}`} className="flex-1 rounded-lg bg-violet-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-violet-500">
                      View / Edit
                    </Link>
                    <button type="button" disabled={busy === r._id} onClick={() => toggleActive(r._id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${r.isActive === false ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400'}`}>
                      {r.isActive === false ? 'Activate' : 'Deactivate'}
                    </button>
                    <button type="button" disabled={busy === r._id} onClick={() => deleteRecord(r._id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-neutral-500">No pastors found.</div>
        )}
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        limit={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        className="mt-4"
      />
    </div>
  );
}

// ── Tab: Upgrade Member ────────────────────────────────────────────────────────

function UpgradeMemberTab({
  churches,
  token,
  onRefresh,
  onRefreshTerms,
}: {
  churches: ChurchOption[];
  token: string | null;
  onRefresh: () => void;
  onRefreshTerms: () => void;
}) {
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<UpgradeSpiritualLeaderTarget | null>(null);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedChurchName = churches.find((c) => c._id === selectedChurchId)?.name || '—';

  async function loadMembers(cid: string) {
    if (!token || !cid) { setMembers([]); return; }
    try {
      const rows = await apiFetch<MemberOption[]>(`/api/superadmin/pastor-members-all?churchId=${encodeURIComponent(cid)}`, { token });
      setMembers(rows);
    } catch { /* ignore */ }
  }

  useEffect(() => { void loadMembers(selectedChurchId); }, [selectedChurchId, token]); // eslint-disable-line

  const existingPastor = members.find((m) => m.memberCategory === 'PASTOR');
  const alreadyHasPastor = Boolean(existingPastor);

  function openUpgradeModal(m: MemberOption) {
    if (alreadyHasPastor || !selectedChurchId) return;
    setUpgradeTarget({
      userId: m._id,
      fullName: m.fullName || m.email || 'Member',
      email: m.email,
      memberId: m.memberId,
      contactPhone: m.contactPhone,
      dateOfBirth: m.dateOfBirth,
      gender: m.gender,
      role: m.role,
      memberCategory: m.memberCategory,
    });
  }

  async function confirmUpgrade(termLengthYears: PastorTermLengthYears) {
    if (!token || !upgradeTarget || !selectedChurchId) return;
    setUpgradeBusy(true);
    setErr(null);
    setSuccessMsg(null);
    try {
      await apiFetch('/api/superadmin/pastor-terms/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({
          churchId: selectedChurchId,
          pastorUserId: upgradeTarget.userId,
          termLengthYears,
        }),
      });
      await apiFetch(`/api/superadmin/members/${upgradeTarget.userId}/upgrade-to-pastor`, { method: 'POST', token });
      setSuccessMsg(
        `${upgradeTarget.fullName} is now PASTOR and spiritual leader with a ${termLengthYears === 1 ? '1-year' : '4-year'} term.`
      );
      setUpgradeTarget(null);
      await loadMembers(selectedChurchId);
      onRefresh();
      onRefreshTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to upgrade and assign term');
    } finally {
      setUpgradeBusy(false);
    }
  }

  async function grantAdmin(userId: string, fullName: string) {
    if (!token || !confirm(`Grant ADMIN access to ${fullName}? They will be able to log in as church admin.`)) return;
    setBusy(userId + '_admin'); setErr(null); setSuccessMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${userId}/grant-admin`, { method: 'POST', token });
      setSuccessMsg(`Admin access granted to ${fullName}.`);
      await loadMembers(selectedChurchId);
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function revokeAdmin(userId: string, fullName: string) {
    if (!token || !confirm(`Revoke ADMIN access from ${fullName}? They will return to MEMBER role.`)) return;
    setBusy(userId + '_revoke'); setErr(null); setSuccessMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${userId}/revoke-admin`, { method: 'POST', token });
      setSuccessMsg(`Admin access revoked from ${fullName}.`);
      await loadMembers(selectedChurchId);
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  return (
    <div className="dashboard-page w-full min-w-0 space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
        <strong>Rules:</strong> Each church can have <strong>only one spiritual leader</strong>. Upgrading opens a confirmation
        modal to set <em>PASTOR</em> category and assign a 1-year or 4-year term on Pastors / Spiritual leaders.
        Admin access lets the pastor log in as church admin — <strong>SUPERADMIN cannot be granted</strong>.
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Select Church</label>
        <select value={selectedChurchId} onChange={(e) => setSelectedChurchId(e.target.value)} className={`max-w-sm ${field}`}>
          <option value="">Select sub-church</option>
          {churches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {alreadyHasPastor && existingPastor && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:bg-violet-900/20 dark:border-violet-700">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-200 text-violet-700 font-bold text-sm dark:bg-violet-800 dark:text-violet-200">
            {(existingPastor.fullName || existingPastor.email || 'P').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
              Current Pastor: {existingPastor.fullName || existingPastor.email}
            </p>
            <p className="text-xs text-violet-700 dark:text-violet-300">
              Member ID: {existingPastor.memberId || '—'} · System role: {existingPastor.role || 'MEMBER'}
            </p>
            <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
              This church already has a pastor. To assign a different person, first remove the current pastor&apos;s category via their profile.
            </p>
          </div>
        </div>
      )}

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}
      {successMsg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{successMsg}</p>}

      {members.length > 0 && (
        <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Member ID</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">System Role</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800 dark:text-neutral-200">
              {members.map((m) => {
                const isPastor = m.memberCategory === 'PASTOR';
                const isAdmin = m.role === 'ADMIN';
                return (
                  <tr key={m._id} className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${isPastor ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      {m.fullName || m.email || '—'}
                      {isPastor && <span className="ml-2 text-xs text-violet-500 dark:text-violet-400">(Current Pastor)</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{m.memberId || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPastor ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                        {m.memberCategory || 'MEMBER'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isAdmin ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                        {m.role || 'MEMBER'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!isPastor && (
                          <button
                            type="button"
                            disabled={alreadyHasPastor || upgradeBusy}
                            onClick={() => openUpgradeModal(m)}
                            title={alreadyHasPastor ? 'This church already has a pastor' : 'Upgrade and assign spiritual leader term'}
                            className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Make Pastor
                          </button>
                        )}
                        {isPastor && (
                          isAdmin ? (
                            <button type="button" disabled={busy === m._id + '_revoke'}
                              onClick={() => revokeAdmin(m._id, m.fullName || m.email || 'Pastor')}
                              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400">
                              {busy === m._id + '_revoke' ? '…' : 'Revoke Admin'}
                            </button>
                          ) : (
                            <button type="button" disabled={busy === m._id + '_admin'}
                              onClick={() => grantAdmin(m._id, m.fullName || m.email || 'Pastor')}
                              className="rounded-lg border border-sky-300 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-700 dark:text-sky-400">
                              {busy === m._id + '_admin' ? '…' : 'Grant Admin'}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {selectedChurchId && members.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">No members found for this church.</p>
      )}

      <UpgradeSpiritualLeaderModal
        open={!!upgradeTarget}
        churchName={selectedChurchName}
        target={upgradeTarget}
        busy={upgradeBusy}
        onClose={() => {
          if (!upgradeBusy) setUpgradeTarget(null);
        }}
        onConfirm={(termLengthYears) => void confirmUpgrade(termLengthYears)}
      />
    </div>
  );
}

// ── Tab: Terms ─────────────────────────────────────────────────────────────────

function TermsTab({
  terms,
  churches,
  token,
  onRefreshTerms,
  setAssignOpen,
  setAssignChurchId,
}: {
  terms: PastorTerm[];
  churches: ChurchOption[];
  token: string | null;
  onRefreshTerms: () => void;
  setAssignOpen: (v: boolean) => void;
  setAssignChurchId: (id: string) => void;
}) {
  const [churchFilter, setChurchFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PASTOR_PAGE_DEFAULT);

  const filtered = useMemo(() => {
    let rows = terms;
    if (churchFilter) rows = rows.filter((t) => churchIdFromRef(t.church, churches) === churchFilter);
    return rows;
  }, [terms, churchFilter, churches]);

  const leadershipOnlyCount = useMemo(
    () => terms.filter((t) => isLeadershipOnlyRow(t)).length,
    [terms]
  );
  const termRecordCount = terms.length - leadershipOnlyCount;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  async function renew(termId: string) {
    if (!token) return;
    setBusyId(termId); setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${termId}/renew`, { method: 'POST', token });
      onRefreshTerms();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to renew'); }
    finally { setBusyId(null); }
  }

  async function transfer(termId: string) {
    if (!token || !transferTo[termId]) return;
    setBusyId(termId); setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${termId}/transfer`, {
        method: 'POST', token,
        body: JSON.stringify({ toChurchId: transferTo[termId] }),
      });
      setTransferTo((p) => { const n = { ...p }; delete n[termId]; return n; });
      onRefreshTerms();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to transfer'); }
    finally { setBusyId(null); }
  }

  const churchHasActive = (cid: string) =>
    terms.some(
      (t) =>
        churchIdFromRef(t.church, churches) === cid &&
        (ACTIVE_TERM_STATUSES.includes(t.status as (typeof ACTIVE_TERM_STATUSES)[number]) ||
          isLeadershipOnlyRow(t))
    );

  function openAssignModal() {
    if (!churchFilter) {
      setErr('Select a church in the filter first, then assign a term.');
      return;
    }
    if (churchHasActive(churchFilter)) {
      setErr('This church already has an active term. Renew or transfer the current leader first.');
      return;
    }
    setErr(null);
    setAssignChurchId(churchFilter);
    setAssignOpen(true);
  }

  return (
    <div className="space-y-4">
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}

      <div className={toolbarRow}>
        <select value={churchFilter} onChange={(e) => { setChurchFilter(e.target.value); setPage(1); }} className={`${toolbarControl} sm:max-w-xs ${field}`}>
          <option value="">All sub-churches</option>
          {churches.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={openAssignModal} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
          + Assign term (1 or 4 years)
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Main church pastor is managed on the <strong>Main Church Pastor</strong> tab (sub-church pastors only). Other
        leaders set only in church leadership (no term dates yet) show as &quot;Church leadership&quot;.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Term records', value: termRecordCount, color: 'text-neutral-700' },
          { label: 'Leadership only', value: leadershipOnlyCount, color: 'text-amber-700' },
          { label: 'Active', value: terms.filter((t) => ['ASSIGNED', 'RENEWED'].includes(t.status)).length, color: 'text-emerald-700' },
          { label: 'Transfer Required', value: terms.filter((t) => t.status === 'TRANSFER_REQUIRED').length, color: 'text-amber-700' },
          { label: 'Transferred', value: terms.filter((t) => t.status === 'TRANSFERRED').length, color: 'text-neutral-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Pastor / Leader</th>
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Length</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800 dark:text-neutral-200">
            {paged.map((t) => {
              const cid = churchIdFromRef(t.church, churches);
              const cname = churchNameFromRef(t.church, churches);

              if (isLeadershipOnlyRow(t) || isCategoryOnlyRow(t)) {
                const categoryOnly = isCategoryOnlyRow(t);
                return (
                  <tr key={t._id} className={`border-b last:border-0 ${categoryOnly ? 'border-violet-100 bg-violet-50/50 dark:border-violet-900/30 dark:bg-violet-950/20' : 'border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20'}`}>
                    <td className="px-4 py-3 font-medium">{cname}</td>
                    <td className="px-4 py-3">{t.pastor?.fullName || t.pastor?.email || '—'}</td>
                    <td className="px-4 py-3 text-neutral-500">{t.pastor?.memberId || '—'}</td>
                    <td className="px-4 py-3 text-amber-800">—</td>
                    <td className="px-4 py-3 text-amber-800">No term yet</td>
                    <td className="px-4 py-3 text-neutral-500">—</td>
                    <td className="px-4 py-3 text-neutral-500">—</td>
                    <td className="px-4 py-3">
                      <span className={categoryOnly ? pastorPoolBadgeClass : pastorMainLeaderBadgeClass}>
                        {categoryOnly ? 'PASTOR category' : 'Church leadership'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-sky-300 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50"
                          onClick={() => {
                            setChurchFilter(cid);
                            setAssignChurchId(cid);
                            setAssignOpen(true);
                          }}
                        >
                          Create term
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              const canRenew =
                (t.status === 'ASSIGNED' || t.status === 'RENEWED') &&
                t.termNumber < MAX_PASTOR_TERM_CYCLES &&
                !!t.termEnd &&
                isWithinRenewWindow(t.termEnd);
              const canTransfer = t.status !== 'TRANSFERRED' && !isLeadershipOnlyRow(t);
              return (
                <tr key={t._id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">{cname}</td>
                  <td className="px-4 py-3">{t.pastor?.fullName || '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{t.pastor?.memberId || '—'}</td>
                  <td className="px-4 py-3">{pastorTermCycleLabel(t.termNumber, t.termLengthYears)}</td>
                  <td className="px-4 py-3 text-neutral-500">{pastorTermLengthLabel(t.termLengthYears)}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(t.termStart)}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(t.termEnd)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] || 'bg-neutral-100 text-neutral-600'}`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end flex-wrap gap-2">
                      <button type="button" disabled={busyId === t._id || !canRenew} onClick={() => renew(t._id)}
                        className="rounded-lg border border-violet-300 px-2 py-1 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-700 dark:text-violet-300">
                        Renew
                      </button>
                      {canTransfer && (
                        <>
                          <select value={transferTo[t._id] || ''} onChange={(e) => setTransferTo((p) => ({ ...p, [t._id]: e.target.value }))}
                            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300">
                            <option value="">Transfer to…</option>
                            {churches.filter((c) => c._id !== cid && !churchHasActive(c._id)).map((c) => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                          <button type="button" disabled={busyId === t._id || !transferTo[t._id]} onClick={() => transfer(t._id)}
                            className="rounded-lg border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-40 dark:border-amber-700 dark:text-amber-300">
                            Transfer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-8 text-center text-sm text-neutral-500">No terms found.</p>}
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        limit={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        className="mt-4"
      />
    </div>
  );
}

// ── Tab: Remove spiritual leader ─────────────────────────────────────────────

function RemoveLeadersTab({
  terms,
  churches,
  token,
  onRefreshTerms,
}: {
  terms: PastorTerm[];
  churches: ChurchOption[];
  token: string | null;
  onRefreshTerms: () => void;
}) {
  const [churchFilter, setChurchFilter] = useState('');
  const [removeTarget, setRemoveTarget] = useState<SpiritualLeaderRemoveTarget | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PASTOR_PAGE_DEFAULT);

  const leaders = useMemo(() => removableLeaders(terms), [terms]);

  const filtered = useMemo(() => {
    let rows = leaders;
    if (churchFilter) rows = rows.filter((t) => churchIdFromRef(t.church, churches) === churchFilter);
    return rows;
  }, [leaders, churchFilter, churches]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  async function confirmRemove() {
    if (!token || !removeTarget) return;
    setRemoveBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${encodeURIComponent(removeTarget.id)}`, {
        method: 'DELETE',
        token,
      });
      setRemoveTarget(null);
      onRefreshTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove spiritual leader');
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-900 dark:text-red-200">Remove a spiritual leader</p>
        <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90">
          Select a leader below and click Remove leader. Sub-churches only — use the{' '}
          <strong>Main Church Pastor</strong> tab for the denomination main church. This clears the spiritual pastor role
          and deletes the term record when applicable.
        </p>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={churchFilter}
          onChange={(e) => {
            setChurchFilter(e.target.value);
            setPage(1);
          }}
          className={`w-56 ${field}`}
        >
          <option value="">All sub-churches</option>
          {churches.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {filtered.length} leader{filtered.length === 1 ? '' : 's'} can be removed
        </p>
      </div>

      <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Pastor / Leader</th>
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Term details</th>
              <th className="px-4 py-3 text-right font-medium">Remove</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800 dark:text-neutral-200">
            {paged.map((t) => {
              const cname = churchNameFromRef(t.church, churches);
              const leadershipOnly = isLeadershipOnlyRow(t);
              const categoryOnly = isCategoryOnlyRow(t);
              return (
                <tr
                  key={t._id}
                  className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${leadershipOnly || categoryOnly ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                >
                  <td className="px-4 py-3 font-medium">{cname}</td>
                  <td className="px-4 py-3">{t.pastor?.fullName || t.pastor?.email || '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{t.pastor?.memberId || '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{t.pastor?.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        leadershipOnly
                          ? pastorMainLeaderBadgeClass
                          : categoryOnly
                            ? `rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE.CATEGORY_ONLY}`
                            : `rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] || 'bg-neutral-100 text-neutral-600'}`
                      }
                    >
                      {leadershipOnly
                        ? 'Church leadership'
                        : categoryOnly
                          ? 'PASTOR category'
                          : t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {leadershipOnly ? (
                      'No formal term — leadership only'
                    ) : categoryOnly ? (
                      'PASTOR category — assign a term on Pastors / Spiritual leaders'
                    ) : (
                      <>
                        {pastorTermCycleLabel(t.termNumber, t.termLengthYears)} · {pastorTermLengthLabel(t.termLengthYears)}
                        <br />
                        <span className="text-xs">
                          {fmtDate(t.termStart)} – {fmtDate(t.termEnd)}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(buildRemoveTarget(t, churches))}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Remove leader
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-500">
            No active spiritual leaders to remove. Assign leaders on the Pastors / Spiritual leaders tab first.
          </p>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        limit={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        className="mt-4"
      />

      <RemoveSpiritualLeaderModal
        open={!!removeTarget}
        target={removeTarget}
        busy={removeBusy}
        onClose={() => {
          if (!removeBusy) setRemoveTarget(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function SuperadminPastorManagementPageInner() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => parseTabParam(searchParams.get('tab')));
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [records, setRecords] = useState<PastorRecord[]>([]);
  const [terms, setTerms] = useState<PastorTerm[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [assignChurchId, setAssignChurchId] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [mainChurchId, setMainChurchId] = useState('');

  const subChurches = useMemo(() => subChurchesOnly(churches), [churches]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === 'record-keeping' || raw === 'records') {
      router.replace('/dashboard/superadmin/pastors');
      return;
    }
    setTab(parseTabParam(raw));
  }, [searchParams, router]);

  const selectTab = useCallback(
    (next: Tab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'directory') params.delete('tab');
      else params.set('tab', next);
      const qs = params.toString();
      router.replace(`/dashboard/superadmin/pastor-management${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!loading && (!user || !canAccessSuperadminPanel(user.role))) router.replace('/login');
  }, [loading, user, router]);

  async function loadRecords() {
    if (!token || !canAccessSuperadminPanel(user?.role)) return;
    try {
      const res = await apiFetch<PastorRecord[] | Paginated<PastorRecord>>('/api/superadmin/pastors?limit=200', { token });
      setRecords(excludeMainChurchRows(unwrapPaginatedArray(res), mainChurchId));
    } catch { /* ignore */ }
  }

  async function loadTerms() {
    if (!token || !canAccessSuperadminPanel(user?.role)) return;
    try {
      const res = await apiFetch<PastorTerm[] | Paginated<PastorTerm>>('/api/superadmin/pastor-terms?limit=200', { token });
      setTerms(excludeMainChurchRows(unwrapPaginatedArray(res), mainChurchId));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    async function init() {
      if (!token || !canAccessSuperadminPanel(user?.role)) return;
      try {
        const [subChurchRes, mainRes, pastorRes, termRes] = await Promise.all([
          apiFetch<ChurchOption[] | Paginated<ChurchOption>>('/api/superadmin/sub-churches?limit=500', { token }),
          apiFetch<ChurchOption[]>('/api/superadmin/main-churches', { token }),
          apiFetch<PastorRecord[] | Paginated<PastorRecord>>('/api/superadmin/pastors?limit=200', { token }),
          apiFetch<PastorTerm[] | Paginated<PastorTerm>>('/api/superadmin/pastor-terms?limit=200', { token }),
        ]);
        const mainList = Array.isArray(mainRes) ? mainRes : [];
        const mainId = mainList[0]?._id ? String(mainList[0]._id) : '';
        setMainChurchId(mainId);
        setChurches(subChurchesOnly(unwrapPaginatedArray(subChurchRes)));
        setRecords(excludeMainChurchRows(unwrapPaginatedArray(pastorRes), mainId));
        setTerms(excludeMainChurchRows(unwrapPaginatedArray(termRes), mainId));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        setPageErr(msg);
      }
    }
    init();
  }, [token, user]);

  useEffect(() => {
    if ((tab === 'remove' || tab === 'terms') && token && canAccessSuperadminPanel(user?.role)) {
      void loadTerms();
    }
  }, [tab, token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !canAccessSuperadminPanel(user.role)) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'directory', label: 'Pastor Directory' },
    { id: 'upgrade', label: 'Congregation Pastors' },
    { id: 'main-pastor', label: 'Main Church Pastor' },
    { id: 'terms', label: 'Pastors / Spiritual leaders' },
    { id: 'remove', label: 'Remove spiritual leader' },
  ];

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        variant="superadmin"
        eyebrow="Leadership"
        title="Pastor Management"
        description="Manage pastors and spiritual leaders. Assign a 1-year or 4-year term (one renewal allowed per assignment)."
      />

      {pageErr && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageErr}</p>}

      <DashboardTabs>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${tab === t.id ? 'bg-white text-violet-700 shadow-sm dark:bg-neutral-900 dark:text-violet-300' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'}`}
          >
            {t.label}
          </button>
        ))}
      </DashboardTabs>

      {tab === 'directory' && (
        <DirectoryTab records={records} churches={subChurches}
          selectedChurchId={selectedChurchId} setSelectedChurchId={setSelectedChurchId}
          token={token} onRefresh={() => void loadRecords()} />
      )}
      {tab === 'upgrade' && (
        <SubChurchPastorsTab
          churches={subChurches}
          token={token}
          onRefresh={() => void loadRecords()}
          onRefreshTerms={() => void loadTerms()}
        />
      )}
      {tab === 'main-pastor' && (
        <MainChurchPastorTab token={token} onRefreshTerms={() => void loadTerms()} />
      )}
      {tab === 'terms' && (
        <TermsTab
          terms={terms}
          churches={subChurches}
          token={token}
          onRefreshTerms={() => void loadTerms()}
          setAssignOpen={setAssignOpen}
          setAssignChurchId={setAssignChurchId}
        />
      )}
      {tab === 'remove' && (
        <RemoveLeadersTab
          terms={terms}
          churches={subChurches}
          token={token}
          onRefreshTerms={() => void loadTerms()}
        />
      )}

      <PastorAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        token={token}
        churchId={assignChurchId || selectedChurchId}
        mode="superadmin"
        onSaved={() => void loadTerms()}
      />
    </DashboardPageShell>
  );
}

export default function SuperadminPastorManagementPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-neutral-500">Loading…</div>}>
      <SuperadminPastorManagementPageInner />
    </Suspense>
  );
}

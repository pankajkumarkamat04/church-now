'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PastorAssignModal } from '@/components/church/PastorAssignModal';

const PASTOR_PAGE_DEFAULT = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

type ChurchOption = { _id: string; name: string; churchType?: 'MAIN' | 'SUB' };
type MemberAddress = { line1?: string; line2?: string; city?: string; stateOrProvince?: string; postalCode?: string; country?: string };
type MemberOption = {
  _id: string; fullName?: string; email?: string; memberId?: string;
  contactPhone?: string; address?: MemberAddress; dateOfBirth?: string;
  gender?: string; role?: string; memberCategory?: string;
};
type PastorRecord = {
  _id: string; isActive?: boolean; currentRole?: string;
  _termOnly?: boolean; _termId?: string;
  church?: { _id?: string; name?: string; churchType?: string } | string;
  member?: { _id?: string; fullName?: string; email?: string; memberId?: string; role?: string; memberCategory?: string; adminChurches?: string[] };
  personal?: { name?: string; fullName?: string; title?: string; contactEmail?: string; email?: string; contactPhone?: string; dateOfBirth?: string; gender?: string; address?: string };
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
};
type PastorTerm = {
  _id: string; status: 'ASSIGNED' | 'RENEWED' | 'TRANSFER_REQUIRED' | 'TRANSFERRED';
  termNumber: number; termStart: string; termEnd: string;
  church?: { _id?: string; name?: string } | string;
  pastor?: { _id?: string; fullName?: string; email?: string; memberId?: string };
  transferredToChurch?: { _id?: string; name?: string } | string;
};

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
function churchName(r: PastorRecord | PastorTerm) {
  return typeof r.church === 'object' && r.church ? (r.church as { name?: string }).name || '—' : '—';
}
function churchId(r: PastorRecord | PastorTerm): string {
  return typeof r.church === 'object' && r.church ? (r.church as { _id?: string })._id || '' : '';
}
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
};

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
      <div className="flex flex-wrap gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, church, role…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
        />
        <select value={selectedChurchId} onChange={(e) => { setSelectedChurchId(e.target.value); setPage(1); }} className={`w-48 ${field}`}>
          <option value="">All churches</option>
          {churches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className={`w-36 ${field}`}>
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
          return (
            <div key={r._id} className={`relative flex flex-col rounded-2xl border bg-white shadow-sm dark:bg-neutral-900 ${isTermOnly ? 'border-amber-200 dark:border-amber-800/40' : r.isActive === false ? 'border-neutral-200 opacity-60 dark:border-neutral-800' : 'border-violet-100 dark:border-violet-900/40'}`}>
              {isTermOnly && (
                <div className="rounded-t-2xl bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>⚡</span> Term Assigned — No Profile Record
                </div>
              )}
              <div className="flex items-start gap-3 p-4">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${isTermOnly ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'}`}>
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
                {isTermOnly && (
                  <p className="text-amber-600 dark:text-amber-400">No detailed profile yet. Create one in <strong>Record Keeping</strong>.</p>
                )}
                {!isTermOnly && r.credentials?.denomination && <p><span className="font-medium">Denomination:</span> {r.credentials.denomination}</p>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
                {isTermOnly ? (
                  <span className="flex-1 rounded-lg bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    No Profile — Use Record Keeping
                  </span>
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

function UpgradeMemberTab({ churches, token, onRefresh }: { churches: ChurchOption[]; token: string | null; onRefresh: () => void }) {
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  async function upgrade(userId: string, fullName: string) {
    if (alreadyHasPastor) return;
    if (!token || !confirm(`Upgrade ${fullName} to PASTOR category? Each church can only have one pastor.`)) return;
    setBusy(userId); setErr(null); setSuccessMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${userId}/upgrade-to-pastor`, { method: 'POST', token });
      setSuccessMsg(`${fullName} has been upgraded to PASTOR category.`);
      await loadMembers(selectedChurchId);
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
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
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
        <strong>Rules:</strong> Each church can have <strong>only one Pastor</strong>. Upgrading sets the member category to <em>PASTOR</em>.
        Admin access lets the pastor log in as church admin — <strong>SUPERADMIN cannot be granted</strong>.
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Select Church</label>
        <select value={selectedChurchId} onChange={(e) => setSelectedChurchId(e.target.value)} className={`max-w-sm ${field}`}>
          <option value="">Select church</option>
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
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
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
                          <button type="button" disabled={busy === m._id || alreadyHasPastor}
                            onClick={() => upgrade(m._id, m.fullName || m.email || 'Member')}
                            title={alreadyHasPastor ? 'This church already has a pastor' : 'Set as Pastor'}
                            className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
                            {busy === m._id ? '…' : 'Make Pastor'}
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
    </div>
  );
}

// ── Tab: Terms ─────────────────────────────────────────────────────────────────

function TermsTab({
  terms, churches, token, onRefreshTerms, assignOpen, setAssignOpen,
}: {
  terms: PastorTerm[]; churches: ChurchOption[];
  token: string | null; onRefreshTerms: () => void;
  assignOpen: boolean; setAssignOpen: (v: boolean) => void;
}) {
  const [churchFilter, setChurchFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PASTOR_PAGE_DEFAULT);

  const filtered = useMemo(() => {
    if (!churchFilter) return terms;
    return terms.filter((t) => {
      const cid = typeof t.church === 'object' && t.church ? (t.church as { _id?: string })._id : '';
      return cid === churchFilter;
    });
  }, [terms, churchFilter]);

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

  const activeStatuses = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'];
  const churchHasActive = (cid: string) => terms.some((t) => {
    const tid = typeof t.church === 'object' && t.church ? (t.church as { _id?: string })._id : '';
    return tid === cid && activeStatuses.includes(t.status);
  });

  return (
    <div className="space-y-4">
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <select value={churchFilter} onChange={(e) => { setChurchFilter(e.target.value); setPage(1); }} className={`w-56 ${field}`}>
          <option value="">All churches</option>
          {churches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={() => setAssignOpen(true)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
          + Assign Spiritual Leader
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Terms', value: terms.length, color: 'text-neutral-700' },
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

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Pastor / Leader</th>
              <th className="px-4 py-3 font-medium">Member ID</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800 dark:text-neutral-200">
            {paged.map((t) => {
              const cid = typeof t.church === 'object' && t.church ? (t.church as { _id?: string })._id || '' : '';
              const cname = typeof t.church === 'object' && t.church ? (t.church as { name?: string }).name || '—' : '—';
              const canRenew = (t.status === 'ASSIGNED' || t.status === 'RENEWED') && t.termNumber < 2 && isWithinRenewWindow(t.termEnd);
              const canTransfer = t.status !== 'TRANSFERRED';
              return (
                <tr key={t._id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">{cname}</td>
                  <td className="px-4 py-3">{t.pastor?.fullName || '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{t.pastor?.memberId || '—'}</td>
                  <td className="px-4 py-3">{t.termNumber}/2</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(t.termStart)}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(t.termEnd)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] || 'bg-neutral-100 text-neutral-600'}`}>
                      {t.status.replace('_', ' ')}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'directory' | 'upgrade' | 'terms';

export default function SuperadminPastorManagementPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('directory');
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [records, setRecords] = useState<PastorRecord[]>([]);
  const [terms, setTerms] = useState<PastorTerm[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  async function loadRecords() {
    if (!token || user?.role !== 'SUPERADMIN') return;
    try {
      const res = await apiFetch<{ data: PastorRecord[] } | PastorRecord[]>('/api/superadmin/pastors?limit=200', { token });
      setRecords(Array.isArray(res) ? res : (res.data ?? []));
    } catch { /* ignore */ }
  }

  async function loadTerms() {
    if (!token || user?.role !== 'SUPERADMIN') return;
    try {
      const res = await apiFetch<{ data: PastorTerm[] } | PastorTerm[]>('/api/superadmin/pastor-terms?limit=200', { token });
      setTerms(Array.isArray(res) ? res : (res.data ?? []));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    async function init() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      try {
        const [churchRes, pastorRes, termRes] = await Promise.all([
          apiFetch<{ data: ChurchOption[] } | ChurchOption[]>('/api/superadmin/churches?limit=500', { token }),
          apiFetch<{ data: PastorRecord[] } | PastorRecord[]>('/api/superadmin/pastors?limit=200', { token }),
          apiFetch<{ data: PastorTerm[] } | PastorTerm[]>('/api/superadmin/pastor-terms?limit=200', { token }),
        ]);
        setChurches(Array.isArray(churchRes) ? churchRes : (churchRes.data ?? []));
        setRecords(Array.isArray(pastorRes) ? pastorRes : (pastorRes.data ?? []));
        setTerms(Array.isArray(termRes) ? termRes : (termRes.data ?? []));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        setPageErr(msg);
      }
    }
    init();
  }, [token, user]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'directory', label: 'Pastor Directory' },
    { id: 'upgrade', label: 'Upgrade Member' },
    { id: 'terms', label: 'Leader Terms' },
  ];

  return (
    <div className="w-full min-w-0 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">Leadership</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
          Pastor Management
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage all pastors, spiritual leaders, and reverends across all churches.
        </p>
      </div>

      {pageErr && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageErr}</p>}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:bg-neutral-800 dark:border-neutral-700 w-fit">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-white text-violet-700 shadow-sm dark:bg-neutral-900 dark:text-violet-300' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'directory' && (
        <DirectoryTab records={records} churches={churches}
          selectedChurchId={selectedChurchId} setSelectedChurchId={setSelectedChurchId}
          token={token} onRefresh={() => void loadRecords()} />
      )}
      {tab === 'upgrade' && (
        <UpgradeMemberTab churches={churches} token={token} onRefresh={() => void loadRecords()} />
      )}
      {tab === 'terms' && (
        <TermsTab terms={terms} churches={churches} token={token}
          onRefreshTerms={() => void loadTerms()}
          assignOpen={assignOpen} setAssignOpen={setAssignOpen} />
      )}

      <PastorAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        token={token}
        churchId={selectedChurchId}
        mode="superadmin"
        onSaved={() => void loadTerms()}
      />
    </div>
  );
}

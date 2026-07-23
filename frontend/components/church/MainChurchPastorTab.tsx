'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  PASTOR_TERM_LENGTH_OPTIONS,
  MAX_PASTOR_TERM_CYCLES,
  pastorTermCycleLabel,
  pastorTermRenewalHint,
  type PastorTermLengthYears,
} from '@/lib/pastorTerms';
import {
  RemoveSpiritualLeaderModal,
  type SpiritualLeaderRemoveTarget,
} from '@/components/church/RemoveSpiritualLeaderModal';
import { statsGrid } from '@/lib/responsiveClasses';
import {
  pastorLocalBadgeClass,
  pastorMainLeaderBadgeClass,
  pastorPoolBadgeClass,
} from '@/lib/pastorManagement';

type PastorRow = {
  id: string;
  fullName?: string;
  email?: string;
  memberId?: string;
  pastorServiceScope?: string | null;
  church?: { name?: string };
  isMainChurchSpiritualLeader?: boolean;
  isLocalSpiritual?: boolean;
};

type Overview = {
  mainChurch: { id: string; name: string } | null;
  spiritualLeader: PastorRow | null;
  spiritualTerm: {
    id: string;
    status: string;
    termNumber: number;
    termLengthYears?: number | null;
    termStart?: string | null;
    termEnd?: string | null;
  } | null;
  poolPastors: PastorRow[];
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

const fieldBtn =
  'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700';

const ACTIVE_TERM_STATUSES = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'] as const;

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function isWithinRenewWindow(termEnd: string): boolean {
  const end = new Date(termEnd);
  if (Number.isNaN(end.getTime())) return false;
  const windowStart = new Date(end);
  windowStart.setMonth(windowStart.getMonth() - 1);
  return new Date() >= windowStart && new Date() <= end;
}

function homeChurchLabel(p: PastorRow): string {
  return p.church && typeof p.church === 'object' ? p.church.name || '' : '';
}

function pastorSelectLabel(p: PastorRow): string {
  const name = (p.fullName || p.email || p.id).trim();
  const mid = p.memberId ? String(p.memberId) : '';
  const home = homeChurchLabel(p);
  const base = mid ? `${mid} — ${name}` : name;
  return home ? `${base} (${home})` : base;
}

type Props = {
  token: string | null;
  onRefreshTerms?: () => void;
};

export function MainChurchPastorTab({ token, onRefreshTerms }: Props) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [termLengthYears, setTermLengthYears] = useState<PastorTermLengthYears>(4);
  const [removeTarget, setRemoveTarget] = useState<SpiritualLeaderRemoveTarget | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!token) {
      setLoading(false);
      return;
    }
    const soft = Boolean(opts?.soft);
    if (!soft) setLoading(true);
    setErr(null);
    try {
      const overview = await apiFetch<Overview>('/api/superadmin/main-church/pastors-overview', { token });
      setData(overview);
      const candidates = (overview.poolPastors || []).filter((p) => !p.isMainChurchSpiritualLeader);
      setAssignUserId((prev) => (prev && candidates.some((c) => c.id === prev) ? prev : ''));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (!soft) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  const mainChurch = data?.mainChurch;
  const leader =
    data?.spiritualLeader || data?.poolPastors?.find((p) => p.isMainChurchSpiritualLeader) || null;
  const term = data?.spiritualTerm;
  const pool = (data?.poolPastors || []).filter((p) => !p.isMainChurchSpiritualLeader);

  const selectedPastor = pool.find((p) => p.id === assignUserId) || null;
  const filteredPool = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((p) => pastorSelectLabel(p).toLowerCase().includes(q));
  }, [pool, pickerSearch]);

  const canRenew =
    term &&
    ACTIVE_TERM_STATUSES.includes(term.status as (typeof ACTIVE_TERM_STATUSES)[number]) &&
    term.termNumber < MAX_PASTOR_TERM_CYCLES &&
    term.termEnd &&
    isWithinRenewWindow(term.termEnd);

  async function assignSpiritual(pastorUserId?: string) {
    const uid = pastorUserId || assignUserId;
    if (!token || !mainChurch?.id || !uid) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/pastor-terms/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({ churchId: mainChurch.id, pastorUserId: uid, termLengthYears }),
      });
      setPickerOpen(false);
      await load({ soft: true });
      onRefreshTerms?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    if (!token || !term?.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${term.id}/renew`, { method: 'POST', token });
      await load({ soft: true });
      onRefreshTerms?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to renew');
    } finally {
      setBusy(false);
    }
  }

  function openRemove() {
    if (!mainChurch || !leader) return;
    setRemoveTarget({
      id: term?.id || `leadership_${mainChurch.id}_${leader.id}`,
      leadershipOnly: !term,
      churchId: mainChurch.id,
      churchName: mainChurch.name,
      pastorName: leader.fullName || leader.email || '—',
      memberId: leader.memberId,
      termNumber: term?.termNumber,
      termLengthYears: term?.termLengthYears,
      termStart: term?.termStart ?? null,
      termEnd: term?.termEnd ?? null,
      status: term?.status,
    });
  }

  async function confirmRemove() {
    if (!token || !removeTarget) return;
    setRemoveBusy(true);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${removeTarget.id}`, { method: 'DELETE', token });
      setRemoveTarget(null);
      await load({ soft: true });
      onRefreshTerms?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setRemoveBusy(false);
    }
  }

  if (loading && !data) {
    return <p className="py-12 text-center text-sm text-neutral-500">Loading main church pastors…</p>;
  }

  if (err && !data) {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800">
        <p>{err}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!mainChurch) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        No main church is configured.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
        <p className="font-medium">Main church pastors</p>
        <p className="mt-1 text-violet-800 dark:text-violet-200">
          Pastors at sub-churches who are not the local congregation pastor belong here. One of them may be appointed{' '}
          <strong>main church spiritual leader</strong> for the denomination — only from this leadership tab.
        </p>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Main church spiritual leader</h2>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{mainChurch.name}</p>

        {leader ? (
          <div className={`mt-4 ${statsGrid}`}>
            <div className="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Leader</p>
              <p className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                {leader.fullName || leader.email}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{homeChurchLabel(leader)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
              <p className="text-xs text-neutral-500">Term</p>
              {term ? (
                <p className="mt-1 text-sm">
                  {pastorTermCycleLabel(term.termNumber, term.termLengthYears)} · ends {fmtDate(term.termEnd)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-neutral-500">Leadership only (no term record)</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">No main church spiritual leader appointed.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {leader && (
            <>
              <button
                type="button"
                disabled={busy || !canRenew}
                onClick={() => void renew()}
                className="rounded-lg border border-violet-300 px-3 py-2 text-sm font-medium text-violet-800 disabled:opacity-40"
              >
                Renew term
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={openRemove}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-800"
              >
                Unassign main church leader
              </button>
            </>
          )}
        </div>
      </div>

      {!leader && pool.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold">Appoint spiritual leader from pool</h3>
          <label className="mb-1 mt-3 block text-xs font-medium text-neutral-600">Spiritual leader</label>
          <div className="flex gap-2">
            <div
              className="min-w-0 flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              title={selectedPastor ? pastorSelectLabel(selectedPastor) : undefined}
            >
              {selectedPastor ? pastorSelectLabel(selectedPastor) : '— None —'}
            </div>
            <button
              type="button"
              onClick={() => {
                setPickerSearch('');
                setPickerOpen(true);
              }}
              className={`${fieldBtn} inline-flex shrink-0 items-center gap-1`}
            >
              <Search className="size-3.5" />
              Select
            </button>
            {selectedPastor ? (
              <button
                type="button"
                onClick={() => setAssignUserId('')}
                className={`${fieldBtn} shrink-0 px-2`}
                aria-label="Clear"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <select
            value={termLengthYears}
            onChange={(e) => setTermLengthYears(Number(e.target.value) === 1 ? 1 : 4)}
            className={`mt-3 ${field}`}
          >
            {PASTOR_TERM_LENGTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-neutral-500">{pastorTermRenewalHint(termLengthYears)}</p>
          <button
            type="button"
            disabled={busy || !assignUserId}
            onClick={() => void assignSpiritual()}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            Appoint as main church spiritual leader
          </button>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Main church pool ({pool.length + (leader ? 1 : 0)} pastors)
        </h3>
        <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800">
                <th className="px-4 py-3 font-medium">Pastor</th>
                <th className="px-4 py-3 font-medium">Home church</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.poolPastors.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b last:border-0 dark:border-neutral-800 ${p.isMainChurchSpiritualLeader ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                >
                  <td className="px-4 py-3 font-medium">{p.fullName || p.email}</td>
                  <td className="px-4 py-3 text-neutral-500">{homeChurchLabel(p) || '—'}</td>
                  <td className="px-4 py-3">
                    {p.isMainChurchSpiritualLeader ? (
                      <span className={pastorMainLeaderBadgeClass}>Main church spiritual leader</span>
                    ) : p.isLocalSpiritual ? (
                      <span className={pastorLocalBadgeClass}>Local pastor (elsewhere)</span>
                    ) : (
                      <span className={pastorPoolBadgeClass}>Main church pool</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!p.isMainChurchSpiritualLeader && !leader && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setAssignUserId(p.id)}
                        className="rounded-lg border border-violet-300 px-2 py-1 text-xs font-medium text-violet-800"
                      >
                        Select
                      </button>
                    )}
                    {p.isMainChurchSpiritualLeader && (
                      <span className="text-xs text-neutral-500">Current leader</span>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.poolPastors.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    No pastors in the main church pool. Add pastors at a sub-church on the Congregation Pastors tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-[1px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Select spiritual leader</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Choose from the main church pastor pool.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search name, member ID, or church…"
                  className={`${field} pl-9`}
                  autoFocus
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredPool.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-neutral-500">No matching pastors in the pool.</p>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredPool.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignUserId(p.id);
                          setPickerOpen(false);
                        }}
                        className={`flex w-full flex-col items-start px-5 py-3 text-left text-sm hover:bg-violet-50 dark:hover:bg-violet-950/30 ${
                          assignUserId === p.id ? 'bg-violet-50 dark:bg-violet-950/40' : ''
                        }`}
                      >
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {p.fullName || p.email}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {[p.memberId, homeChurchLabel(p)].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

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

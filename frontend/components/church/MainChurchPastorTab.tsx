'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  PASTOR_TERM_LENGTH_OPTIONS,
  MAX_PASTOR_TERM_CYCLES,
  pastorTermCycleLabel,
  pastorTermLengthLabel,
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
  const [termLengthYears, setTermLengthYears] = useState<PastorTermLengthYears>(4);
  const [removeTarget, setRemoveTarget] = useState<SpiritualLeaderRemoveTarget | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const overview = await apiFetch<Overview>('/api/superadmin/main-church/pastors-overview', { token });
      setData(overview);
      const candidates = (overview.poolPastors || []).filter((p) => !p.isMainChurchSpiritualLeader);
      setAssignUserId((prev) =>
        prev && candidates.some((c) => c.id === prev) ? prev : candidates[0]?.id || ''
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const mainChurch = data?.mainChurch;
  const leader =
    data?.spiritualLeader ||
    data?.poolPastors?.find((p) => p.isMainChurchSpiritualLeader) ||
    null;
  const term = data?.spiritualTerm;
  const pool = (data?.poolPastors || []).filter((p) => !p.isMainChurchSpiritualLeader);

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
      await load();
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
      await load();
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
      await load();
      onRefreshTerms?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setRemoveBusy(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-neutral-500">Loading main church pastors…</p>;
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
          <strong>main church spiritual leader</strong> for the denomination.
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
          <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className={`mt-3 ${field}`}>
            <option value="">Select pastor</option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName || p.email} {homeChurchLabel(p) ? `(${homeChurchLabel(p)})` : ''}
              </option>
            ))}
          </select>
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
                        onClick={() => void assignSpiritual(p.id)}
                        className="rounded-lg border border-violet-300 px-2 py-1 text-xs font-medium text-violet-800"
                      >
                        Appoint leader
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

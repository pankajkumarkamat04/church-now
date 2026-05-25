'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, unwrapPaginatedArray } from '@/lib/api';
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

type ChurchMemberRef = {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  memberId?: string;
};

type MainChurchRow = {
  _id: string;
  name: string;
  churchType?: 'MAIN';
  localLeadership?: {
    spiritualPastor?: ChurchMemberRef | string | null;
  };
};

type SubChurchPastorOption = {
  _id: string;
  fullName?: string;
  email?: string;
  memberId?: string;
  church?: { _id?: string; name?: string; churchType?: string } | string;
};

type PastorTerm = {
  _id: string;
  status: string;
  termNumber: number;
  termLengthYears?: number | null;
  termStart?: string | null;
  termEnd?: string | null;
  pastor?: ChurchMemberRef;
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

const ACTIVE_TERM_STATUSES = ['ASSIGNED', 'RENEWED', 'TRANSFER_REQUIRED'] as const;

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function spiritualPastorId(church: MainChurchRow | null): string {
  const sp = church?.localLeadership?.spiritualPastor;
  if (!sp) return '';
  if (typeof sp === 'string') return sp;
  return String(sp._id || sp.id || '');
}

function spiritualPastorDisplay(church: MainChurchRow | null): string {
  const sp = church?.localLeadership?.spiritualPastor;
  if (!sp || typeof sp === 'string') return '—';
  return sp.fullName || sp.email || '—';
}

function isWithinRenewWindow(termEnd: string): boolean {
  const end = new Date(termEnd);
  if (Number.isNaN(end.getTime())) return false;
  const windowStart = new Date(end);
  windowStart.setMonth(windowStart.getMonth() - 1);
  const now = new Date();
  return now >= windowStart && now <= end;
}

function homeChurchLabel(p: SubChurchPastorOption): string {
  const c = p.church;
  if (!c) return '';
  if (typeof c === 'object' && c.name) return c.name;
  return '';
}

type Props = {
  token: string | null;
  onRefreshTerms?: () => void;
};

export function MainChurchPastorTab({ token, onRefreshTerms }: Props) {
  const [mainChurch, setMainChurch] = useState<MainChurchRow | null>(null);
  const [terms, setTerms] = useState<PastorTerm[]>([]);
  const [candidates, setCandidates] = useState<SubChurchPastorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pastorUserId, setPastorUserId] = useState('');
  const [termLengthYears, setTermLengthYears] = useState<PastorTermLengthYears>(4);
  const [removeTarget, setRemoveTarget] = useState<SpiritualLeaderRemoveTarget | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const mainRows = await apiFetch<MainChurchRow[]>('/api/superadmin/main-churches', { token });
      const main = Array.isArray(mainRows) ? mainRows[0] : null;
      if (!main?._id) {
        setMainChurch(null);
        setTerms([]);
        setCandidates([]);
        return;
      }
      setMainChurch(main);

      const [termRes, pastorRes] = await Promise.all([
        apiFetch<PastorTerm[] | { data: PastorTerm[] }>(
          `/api/superadmin/pastor-terms?churchId=${encodeURIComponent(main._id)}&limit=50`,
          { token }
        ),
        apiFetch<SubChurchPastorOption[]>(
          `/api/superadmin/pastor-members?churchId=${encodeURIComponent(main._id)}`,
          { token }
        ),
      ]);
      setTerms(unwrapPaginatedArray(termRes));
      const list = Array.isArray(pastorRes) ? pastorRes : [];
      setCandidates(list);
      setPastorUserId((prev) => (prev && list.some((p) => p._id === prev) ? prev : list[0]?._id || ''));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load main church pastor');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTerm = useMemo(
    () =>
      terms.find((t) =>
        ACTIVE_TERM_STATUSES.includes(t.status as (typeof ACTIVE_TERM_STATUSES)[number])
      ) ?? null,
    [terms]
  );

  const leadershipPastorId = spiritualPastorId(mainChurch);
  const hasLeader = Boolean(leadershipPastorId || activeTerm);
  const canAssign = !activeTerm && !leadershipPastorId;

  async function assign() {
    if (!token || !mainChurch?._id || !pastorUserId) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/superadmin/pastor-terms/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({
          churchId: mainChurch._id,
          pastorUserId,
          termLengthYears,
        }),
      });
      await load();
      onRefreshTerms?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to assign main church pastor');
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    if (!token || !activeTerm) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/pastor-terms/${activeTerm._id}/renew`, { method: 'POST', token });
      await load();
      onRefreshTerms?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to renew term');
    } finally {
      setBusy(false);
    }
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
      setErr(e instanceof Error ? e.message : 'Failed to remove pastor');
    } finally {
      setRemoveBusy(false);
    }
  }

  function openRemove() {
    if (!mainChurch) return;
    const pastor = activeTerm?.pastor;
    const id = activeTerm?._id || (leadershipPastorId ? `leadership_${mainChurch._id}_${leadershipPastorId}` : '');
    if (!id) return;
    setRemoveTarget({
      id,
      leadershipOnly: !activeTerm && Boolean(leadershipPastorId),
      churchId: mainChurch._id,
      churchName: mainChurch.name,
      pastorName: pastor?.fullName || pastor?.email || spiritualPastorDisplay(mainChurch),
      pastorEmail: pastor?.email,
      memberId: pastor?.memberId,
      termNumber: activeTerm?.termNumber,
      termLengthYears: activeTerm?.termLengthYears,
      termStart: activeTerm?.termStart ?? null,
      termEnd: activeTerm?.termEnd ?? null,
      status: activeTerm?.status,
    });
  }

  const canRenew =
    activeTerm &&
    (activeTerm.status === 'ASSIGNED' || activeTerm.status === 'RENEWED') &&
    activeTerm.termNumber < MAX_PASTOR_TERM_CYCLES &&
    !!activeTerm.termEnd &&
    isWithinRenewWindow(activeTerm.termEnd);

  if (loading) {
    return <p className="py-12 text-center text-sm text-neutral-500">Loading main church pastor…</p>;
  }

  if (!mainChurch) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        No main church is configured. Create the main church under Congregations first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
        <p className="font-medium">Main church pastor rule</p>
        <p className="mt-1 text-violet-800 dark:text-violet-200">
          The main church spiritual pastor must be an active <strong>PASTOR</strong> from a{' '}
          <strong>sub-church</strong> congregation. They remain a member of their home sub-church while serving the
          denomination main church.
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Main church</p>
        <h2 className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{mainChurch.name}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
            <p className="text-xs text-neutral-500">Spiritual pastor (leadership)</p>
            <p className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
              {spiritualPastorDisplay(mainChurch)}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
            <p className="text-xs text-neutral-500">Active term</p>
            {activeTerm ? (
              <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {pastorTermCycleLabel(activeTerm.termNumber, activeTerm.termLengthYears)} ·{' '}
                {pastorTermLengthLabel(activeTerm.termLengthYears)} · ends {fmtDate(activeTerm.termEnd)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">No active term record</p>
            )}
          </div>
        </div>

        {hasLeader && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !canRenew}
              onClick={() => void renew()}
              className="rounded-lg border border-violet-300 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-700 dark:text-violet-200"
            >
              Renew term
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={openRemove}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 dark:border-red-800 dark:text-red-200"
            >
              Remove main church pastor
            </button>
          </div>
        )}
        {activeTerm && !canRenew && activeTerm.termEnd && (
          <p className="mt-2 text-xs text-neutral-500">
            Renewal opens in the final month before term end ({fmtDate(activeTerm.termEnd)}).
          </p>
        )}
      </div>

      {canAssign ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assign main church pastor</h3>
          <p className="mt-1 text-xs text-neutral-500">Choose a pastor from any sub-church congregation.</p>

          {candidates.length === 0 ? (
            <p className="mt-4 text-sm text-amber-800">
              No eligible pastors found. Upgrade a member to PASTOR category at a sub-church first.
            </p>
          ) : (
            <>
              <label className="mb-1 mt-4 block text-xs font-medium text-neutral-600">Sub-church pastor</label>
              <select
                value={pastorUserId}
                onChange={(e) => setPastorUserId(e.target.value)}
                className={field}
              >
                <option value="">Select pastor</option>
                {candidates.map((p) => (
                  <option key={p._id} value={p._id}>
                    {(p.memberId || '—').toString()} — {p.fullName || p.email}
                    {homeChurchLabel(p) ? ` (${homeChurchLabel(p)})` : ''}
                  </option>
                ))}
              </select>

              <label className="mb-1 mt-4 block text-xs font-medium text-neutral-600">Term length</label>
              <select
                value={termLengthYears}
                onChange={(e) => setTermLengthYears(Number(e.target.value) === 1 ? 1 : 4)}
                className={field}
              >
                {PASTOR_TERM_LENGTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-neutral-500">{pastorTermRenewalHint(termLengthYears)}</p>

              <button
                type="button"
                disabled={busy || !pastorUserId}
                onClick={() => void assign()}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {busy ? 'Assigning…' : 'Assign as main church pastor'}
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          To assign a different pastor, remove the current main church pastor first, then assign from the list of
          sub-church pastors.
        </p>
      )}

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

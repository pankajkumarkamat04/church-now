'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toolbarControl, toolbarRow } from '@/lib/responsiveClasses';
import {
  pastorLocalBadgeClass,
  pastorMainLeaderBadgeClass,
  pastorPoolBadgeClass,
} from '@/lib/pastorManagement';
import type { PastorTermLengthYears } from '@/lib/pastorTerms';
import { UpgradeSpiritualLeaderModal, type UpgradeSpiritualLeaderTarget } from '@/components/church/UpgradeSpiritualLeaderModal';

type ChurchOption = { _id: string; name: string };

type PastorRow = {
  id: string;
  fullName?: string;
  email?: string;
  memberId?: string;
  role?: string;
  pastorServiceScope?: 'MAIN_CHURCH' | 'LOCAL' | null;
  church?: { name?: string } | string;
  isLocalSpiritual?: boolean;
  isMainChurchSpiritualLeader?: boolean;
  activeTerm?: { id: string; termEnd?: string | null } | null;
};

type MemberOption = {
  _id: string;
  fullName?: string;
  email?: string;
  memberId?: string;
  role?: string;
  memberCategory?: string;
};

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

type Props = {
  churches: ChurchOption[];
  token: string | null;
  onRefresh: () => void;
  onRefreshTerms: () => void;
};

function scopeLabel(row: PastorRow): string {
  if (row.isMainChurchSpiritualLeader) return 'Main church spiritual leader';
  if (row.isLocalSpiritual || row.pastorServiceScope === 'LOCAL') return 'Local church pastor';
  return 'Pastor (main church)';
}

export function SubChurchPastorsTab({ churches, token, onRefresh, onRefreshTerms }: Props) {
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [pastors, setPastors] = useState<PastorRow[]>([]);
  const [localSpiritualId, setLocalSpiritualId] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<UpgradeSpiritualLeaderTarget | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedChurchName = churches.find((c) => c._id === selectedChurchId)?.name || '—';

  const load = useCallback(async () => {
    if (!token || !selectedChurchId) {
      setPastors([]);
      setMembers([]);
      return;
    }
    setErr(null);
    try {
      const [overview, allMembers] = await Promise.all([
        apiFetch<{
          localSpiritualPastorId?: string;
          pastors: PastorRow[];
        }>(`/api/superadmin/sub-church-pastors?churchId=${encodeURIComponent(selectedChurchId)}`, { token }),
        apiFetch<MemberOption[]>(
          `/api/superadmin/pastor-members-all?churchId=${encodeURIComponent(selectedChurchId)}`,
          { token }
        ),
      ]);
      setLocalSpiritualId(overview.localSpiritualPastorId || '');
      setPastors(overview.pastors || []);
      setMembers(Array.isArray(allMembers) ? allMembers : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load pastors');
    }
  }, [token, selectedChurchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nonPastorMembers = members.filter((m) => m.memberCategory !== 'PASTOR');

  async function addToMainPool(userId: string, name: string) {
    if (!token) return;
    setBusy(userId + '_pool');
    setErr(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/api/superadmin/members/${userId}/upgrade-to-pastor`, { method: 'POST', token });
      setSuccessMsg(`${name} upgraded to pastor.`);
      await load();
      onRefresh();
      onRefreshTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  function openAssignLocal(m: MemberOption | PastorRow) {
    const userId = '_id' in m ? (m as MemberOption)._id : m.id;
    setAssignTarget({
      userId,
      fullName: m.fullName || m.email || 'Pastor',
      email: m.email,
      memberId: m.memberId,
      memberCategory: 'PASTOR',
      role: m.role,
    });
  }

  async function confirmAssignLocal(termLengthYears: PastorTermLengthYears) {
    if (!token || !assignTarget || !selectedChurchId) return;
    setAssignBusy(true);
    setErr(null);
    try {
      if (assignTarget.memberCategory !== 'PASTOR') {
        await apiFetch(`/api/superadmin/members/${assignTarget.userId}/upgrade-to-pastor`, { method: 'POST', token });
      }
      await apiFetch('/api/superadmin/pastor-terms/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({
          churchId: selectedChurchId,
          pastorUserId: assignTarget.userId,
          termLengthYears,
        }),
      });
      setSuccessMsg(`${assignTarget.fullName} is now the local church pastor.`);
      setAssignTarget(null);
      await load();
      onRefresh();
      onRefreshTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to assign local pastor');
    } finally {
      setAssignBusy(false);
    }
  }

  async function unassignLocal(pastorUserId: string, name: string) {
    if (!token || !selectedChurchId || !confirm(`Unassign ${name} as local church pastor? They will remain in the main church pastor pool.`)) return;
    setBusy(pastorUserId + '_ul');
    setErr(null);
    try {
      await apiFetch('/api/superadmin/pastors/unassign-local', {
        method: 'POST',
        token,
        body: JSON.stringify({ churchId: selectedChurchId, pastorUserId }),
      });
      setSuccessMsg(`${name} unassigned as local pastor.`);
      await load();
      onRefreshTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function removePastor(userId: string, name: string) {
    if (!token || !confirm(`Remove ${name} as pastor completely? They will return to member status.`)) return;
    setBusy(userId + '_rm');
    setErr(null);
    try {
      await apiFetch('/api/superadmin/pastors/unassign', {
        method: 'POST',
        token,
        body: JSON.stringify({ userId }),
      });
      setSuccessMsg(`${name} removed as pastor.`);
      await load();
      onRefresh();
      onRefreshTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
        <p className="font-medium">Multiple pastors per congregation</p>
        <p className="mt-1 text-violet-800 dark:text-violet-200">
          A sub-church may have many pastors. <strong>One</strong> is the local church pastor; all others are upgraded
          pastors under the <strong>main church</strong> and are managed on the Main Church Pastor tab (including
          appointment as main church spiritual leader).
        </p>
      </div>

      <div className={toolbarRow}>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Sub-church</label>
          <select
            value={selectedChurchId}
            onChange={(e) => setSelectedChurchId(e.target.value)}
            className={`${toolbarControl} sm:max-w-sm ${field}`}
          >
            <option value="">Select sub-church</option>
            {churches.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p>}
      {successMsg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{successMsg}</p>
      )}

      {selectedChurchId && (
        <>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Pastors at {selectedChurchName}
          </h3>
          <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b bg-neutral-50 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Assignment</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastors.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 dark:border-neutral-800">
                    <td className="px-4 py-3 font-medium">
                      {p.fullName || p.email}
                      <span className="block text-xs text-neutral-500">{p.memberId || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.isMainChurchSpiritualLeader
                            ? pastorMainLeaderBadgeClass
                            : p.isLocalSpiritual
                              ? pastorLocalBadgeClass
                              : pastorPoolBadgeClass
                        }
                      >
                        {scopeLabel(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!p.isLocalSpiritual && !p.isMainChurchSpiritualLeader && !localSpiritualId && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => openAssignLocal(p)}
                            className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-800 disabled:opacity-40"
                          >
                            Assign local
                          </button>
                        )}
                        {p.isLocalSpiritual && !p.isMainChurchSpiritualLeader && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => void unassignLocal(p.id, p.fullName || p.email || 'Pastor')}
                            className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-medium text-amber-800"
                          >
                            Unassign local
                          </button>
                        )}
                        {!p.isMainChurchSpiritualLeader && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => void removePastor(p.id, p.fullName || p.email || 'Pastor')}
                            className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                          >
                            Remove pastor
                          </button>
                        )}
                        {p.isMainChurchSpiritualLeader && (
                          <span className="text-xs text-neutral-500">Manage on Main Church Pastor tab</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pastors.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                      No pastors at this church yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {nonPastorMembers.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Members — upgrade to pastor</h3>
              <div className="table-scroll overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <tbody>
                    {nonPastorMembers.map((m) => (
                      <tr key={m._id} className="border-b last:border-0 dark:border-neutral-800">
                        <td className="px-4 py-3">{m.fullName || m.email}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={busy === m._id + '_pool'}
                            onClick={() => void addToMainPool(m._id, m.fullName || m.email || 'Member')}
                            className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                          >
                            Upgrade to pastor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <UpgradeSpiritualLeaderModal
        open={!!assignTarget}
        churchName={selectedChurchName}
        target={assignTarget}
        busy={assignBusy}
        onClose={() => {
          if (!assignBusy) setAssignTarget(null);
        }}
        onConfirm={(termLengthYears) => void confirmAssignLocal(termLengthYears)}
      />
    </div>
  );
}

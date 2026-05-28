'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, UserPlus, Users, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { ChurchRecord, ChurchMemberRef, LocalLeadership } from '@/app/dashboard/superadmin/churches/types';
import {
  LeadershipMemberPickerModal,
  type LeadershipMemberOption,
  type LeadershipPickerPool,
} from '@/components/church/LeadershipMemberPickerModal';
import {
  LOCAL_ROLE_LABELS,
  LOCAL_SINGLE_KEYS,
  MAIN_LEADERSHIP_KEYS,
  SUB_LEADERSHIP_KEYS,
  poolForLeadershipRoleKey,
} from '@/components/church/churchLeadershipConstants';

const fieldBtn =
  'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700';

function memberRefId(value: string | { _id?: string } | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id || '';
}

function leadershipFromRecord(row: ChurchRecord | null): LocalLeadership {
  if (!row?.localLeadership) return {};
  return row.localLeadership;
}

function labelFromRef(ref: ChurchMemberRef | string | null | undefined): string {
  if (!ref || typeof ref === 'string') return '';
  const name = (ref.fullName || ref.email || '').trim();
  return name || '';
}

function collectLabelsFromLeadership(l: LocalLeadership): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of LOCAL_SINGLE_KEYS) {
    const id = memberRefId(l[key]);
    const label = labelFromRef(l[key]);
    if (id && label) map[id] = label;
  }
  const committee = l.committeeMembers;
  if (Array.isArray(committee)) {
    for (const m of committee) {
      const id = memberRefId(m);
      const label = labelFromRef(m);
      if (id && label) map[id] = label;
    }
  }
  return map;
}

type PickerState =
  | { kind: 'role'; key: (typeof LOCAL_SINGLE_KEYS)[number] }
  | { kind: 'committee' }
  | null;

type ChurchLeadershipModalProps = {
  open: boolean;
  onClose: () => void;
  churchId: string;
  churchType: 'MAIN' | 'SUB';
  churchName: string;
  token: string | null;
  row: ChurchRecord | null;
  onSaved: () => void;
};

export function ChurchLeadershipModal({
  open,
  onClose,
  churchId,
  churchType,
  churchName,
  token,
  row,
  onSaved,
}: ChurchLeadershipModalProps) {
  const isMainChurch = churchType === 'MAIN';
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [singleRoles, setSingleRoles] = useState<Record<(typeof LOCAL_SINGLE_KEYS)[number], string>>({
    churchPresident: '',
    vicePresident: '',
    moderator: '',
    viceModerator: '',
    secretary: '',
    viceSecretary: '',
    treasurer: '',
    viceTreasurer: '',
    minister: '',
    superintendent: '',
    viceSuperintendent: '',
    conferenceMinister1: '',
    conferenceMinister2: '',
    deacon: '',
    viceDeacon: '',
  });
  const [committeeIds, setCommitteeIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<PickerState>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    const l = leadershipFromRecord(row);
    setMemberLabels(collectLabelsFromLeadership(l));
    setSingleRoles({
      churchPresident: memberRefId(l.churchPresident),
      vicePresident: memberRefId(l.vicePresident),
      moderator: memberRefId(l.moderator),
      viceModerator: memberRefId(l.viceModerator),
      superintendent: memberRefId(l.superintendent),
      viceSuperintendent: memberRefId(l.viceSuperintendent),
      conferenceMinister1: memberRefId(l.conferenceMinister1),
      conferenceMinister2: memberRefId(l.conferenceMinister2),
      minister: memberRefId(l.minister),
      deacon: memberRefId(l.deacon),
      viceDeacon: memberRefId(l.viceDeacon),
      secretary: memberRefId(l.secretary),
      viceSecretary: memberRefId(l.viceSecretary),
      treasurer: memberRefId(l.treasurer),
      viceTreasurer: memberRefId(l.viceTreasurer),
    });
    const committee = l.committeeMembers;
    if (Array.isArray(committee)) {
      setCommitteeIds(committee.map((m) => memberRefId(m)).filter(Boolean));
    } else {
      setCommitteeIds([]);
    }
    setErr(null);
    setPicker(null);
  }, [open, row]);

  function registerMember(option: LeadershipMemberOption) {
    setMemberLabels((prev) => ({ ...prev, [option.id]: option.label }));
  }

  function labelForId(id: string): string {
    if (!id) return '';
    return memberLabels[id] || 'Selected member';
  }

  function handlePickerSelect(option: LeadershipMemberOption) {
    registerMember(option);
    if (picker?.kind === 'role') {
      setSingleRoles((s) => ({ ...s, [picker.key]: option.id }));
    } else if (picker?.kind === 'committee') {
      setCommitteeIds((prev) => (prev.includes(option.id) ? prev : [...prev, option.id]));
    }
  }

  function clearRole(key: (typeof LOCAL_SINGLE_KEYS)[number]) {
    setSingleRoles((s) => ({ ...s, [key]: '' }));
  }

  function removeCommittee(id: string) {
    setCommitteeIds((prev) => prev.filter((x) => x !== id));
  }

  async function onSave() {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const localLeadership = {
        churchPresident: singleRoles.churchPresident || null,
        vicePresident: singleRoles.vicePresident || null,
        moderator: singleRoles.moderator || null,
        viceModerator: singleRoles.viceModerator || null,
        superintendent: singleRoles.superintendent || null,
        viceSuperintendent: singleRoles.viceSuperintendent || null,
        conferenceMinister1: singleRoles.conferenceMinister1 || null,
        conferenceMinister2: singleRoles.conferenceMinister2 || null,
        minister: singleRoles.minister || null,
        deacon: singleRoles.deacon || null,
        viceDeacon: singleRoles.viceDeacon || null,
        secretary: singleRoles.secretary || null,
        viceSecretary: singleRoles.viceSecretary || null,
        treasurer: singleRoles.treasurer || null,
        viceTreasurer: singleRoles.viceTreasurer || null,
        committeeMembers: committeeIds,
      };
      const endpoint =
        churchType === 'SUB' ? `/api/superadmin/sub-churches/${churchId}` : `/api/superadmin/main-churches/${churchId}`;
      await apiFetch(endpoint, {
        method: 'PUT',
        token,
        body: JSON.stringify({ localLeadership }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  const pickerPool: LeadershipPickerPool | null = picker
    ? picker.kind === 'committee'
      ? 'lay'
      : poolForLeadershipRoleKey(picker.key)
    : null;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[1px]">
        <div
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
          role="dialog"
          aria-modal="true"
          aria-labelledby="church-leadership-title"
        >
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Church leadership
              </p>
              <h2 id="church-leadership-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {churchName}
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {isMainChurch
                  ? 'Main church leaders are chosen from the global roster: pastors (any conference) for minister roles; lay members (any congregation) for moderator, secretary, treasurer, and committee. Use Select member to filter by conference and church.'
                  : 'Assign leaders from members of this congregation. Councils are managed from the dedicated Councils pages.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Local church leadership</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(churchType === 'MAIN' ? MAIN_LEADERSHIP_KEYS : SUB_LEADERSHIP_KEYS).map((key) => {
                  const selectedId = singleRoles[key];
                  return (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {LOCAL_ROLE_LABELS[key]}
                      </label>
                      <div className="flex gap-2">
                        <div
                          className="min-w-0 flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-200"
                          title={selectedId ? labelForId(selectedId) : undefined}
                        >
                          {selectedId ? labelForId(selectedId) : '— None —'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPicker({ kind: 'role', key })}
                          className={`${fieldBtn} inline-flex shrink-0 items-center gap-1`}
                        >
                          <Search className="size-3.5" />
                          Select
                        </button>
                        {selectedId ? (
                          <button
                            type="button"
                            onClick={() => clearRole(key)}
                            className={`${fieldBtn} shrink-0 px-2`}
                            aria-label="Clear"
                          >
                            <X className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Committee members (elected)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPicker({ kind: 'committee' })}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                  >
                    <UserPlus className="size-3.5" />
                    Add member
                  </button>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/40">
                  {committeeIds.length === 0 ? (
                    <p className="text-sm text-neutral-500">No committee members selected.</p>
                  ) : (
                    <ul className="space-y-2">
                      {committeeIds.map((id) => (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                        >
                          <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-200">
                            {labelForId(id)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCommittee(id)}
                            className="shrink-0 text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-950/50">
            {err ? (
              <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {err}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onClose} className={fieldBtn}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSave()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
                Save leadership
              </button>
            </div>
          </div>
        </div>
      </div>

      {picker && pickerPool ? (
        <LeadershipMemberPickerModal
          open
          onClose={() => setPicker(null)}
          onSelect={handlePickerSelect}
          token={token}
          title={
            picker.kind === 'committee'
              ? 'Add committee member'
              : `Select: ${LOCAL_ROLE_LABELS[picker.key]}`
          }
          description={
            isMainChurch
              ? 'Choose conference, then church (optional), then search and pick a member.'
              : `Search members at ${churchName}.`
          }
          filterMode={isMainChurch ? 'main' : 'fixed-church'}
          fixedChurchId={isMainChurch ? undefined : churchId}
          fixedChurchName={isMainChurch ? undefined : churchName}
          pool={pickerPool}
          selectedId={
            picker.kind === 'role' ? singleRoles[picker.key] : undefined
          }
        />
      ) : null}
    </>
  );
}

export function leadershipSummary(row: ChurchRecord | null): string {
  if (!row?.localLeadership) return 'Not set';
  const l = row.localLeadership;
  const filled = [...new Set(LOCAL_SINGLE_KEYS)].filter((k) => memberRefId(l[k])).length;
  const committee = Array.isArray(l.committeeMembers) ? l.committeeMembers.length : 0;
  const councils = row.councils?.length || 0;
  const parts: string[] = [];
  if (filled) parts.push(`${filled} local role(s)`);
  if (committee) parts.push(`${committee} committee`);
  if (councils) parts.push(`${councils} council(s)`);
  return parts.length ? parts.join(' · ') : 'Not set';
}

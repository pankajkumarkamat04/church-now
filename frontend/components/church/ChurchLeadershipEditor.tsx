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

type Props = {
  churchId: string;
  churchType: 'MAIN' | 'SUB';
  churchName: string;
  token: string | null;
  row: ChurchRecord | null;
  onSaved: () => void;
  /** When false, only render the form (for embedding in a page section). */
  showHeader?: boolean;
};

export function ChurchLeadershipEditor({
  churchId,
  churchType,
  churchName,
  token,
  row,
  onSaved,
  showHeader = true,
}: Props) {
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
    if (!row) return;
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
  }, [row]);

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

  if (!row) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-7 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <>
      {showHeader ? (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Church leadership</p>
          <h2 className="text-lg font-semibold text-neutral-900">{churchName}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {isMainChurch
              ? 'Assign leaders from all active congregation members (pastors for minister roles; lay members for moderator, secretary, treasurer, and committee).'
              : 'Assign leaders from members of this congregation.'}
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {(churchType === 'MAIN' ? MAIN_LEADERSHIP_KEYS : SUB_LEADERSHIP_KEYS).map((key) => {
            const selectedId = singleRoles[key];
            return (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-neutral-600">{LOCAL_ROLE_LABELS[key]}</label>
                <div className="flex gap-2">
                  <div
                    className="min-w-0 flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
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
            <label className="text-xs font-medium text-neutral-600">Committee members (elected)</label>
            <button
              type="button"
              onClick={() => setPicker({ kind: 'committee' })}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
            >
              <UserPlus className="size-3.5" />
              Add member
            </button>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            {committeeIds.length === 0 ? (
              <p className="text-sm text-neutral-500">No committee members selected.</p>
            ) : (
              <ul className="space-y-2">
                {committeeIds.map((id) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-neutral-800">{labelForId(id)}</span>
                    <button
                      type="button"
                      onClick={() => removeCommittee(id)}
                      className="shrink-0 text-red-600 hover:text-red-800"
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

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}

      <div className="mt-4 flex justify-end">
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

      {picker && pickerPool ? (
        <LeadershipMemberPickerModal
          open
          onClose={() => setPicker(null)}
          onSelect={handlePickerSelect}
          token={token}
          title={
            picker.kind === 'committee' ? 'Add committee member' : `Select: ${LOCAL_ROLE_LABELS[picker.key]}`
          }
          description={
            isMainChurch
              ? 'Browse all congregation members, or narrow by conference or church, then search and pick.'
              : `Search members at ${churchName}.`
          }
          filterMode={isMainChurch ? 'main' : 'fixed-church'}
          fixedChurchId={isMainChurch ? undefined : churchId}
          fixedChurchName={isMainChurch ? undefined : churchName}
          pool={pickerPool}
          selectedId={picker.kind === 'role' ? singleRoles[picker.key] : undefined}
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

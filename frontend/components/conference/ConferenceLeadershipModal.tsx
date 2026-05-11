'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Users, X } from 'lucide-react';
import { apiFetch, type Paginated, unwrapPaginatedArray } from '@/lib/api';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type ConferenceLeadership = {
  superintendent?: string | { _id?: string };
  viceSuperintendent?: string | { _id?: string };
  moderator?: string | { _id?: string };
  viceModerator?: string | { _id?: string };
  secretary?: string | { _id?: string };
  viceSecretary?: string | { _id?: string };
  treasurer?: string | { _id?: string };
  viceTreasurer?: string | { _id?: string };
  conferenceMinister1?: string | { _id?: string };
  conferenceMinister2?: string | { _id?: string };
};

type ConferenceRow = {
  _id: string;
  name?: string;
  localLeadership?: ConferenceLeadership;
};

type LeadershipState = {
  superintendent: string;
  viceSuperintendent: string;
  moderator: string;
  viceModerator: string;
  secretary: string;
  viceSecretary: string;
  treasurer: string;
  viceTreasurer: string;
  conferenceMinister1: string;
  conferenceMinister2: string;
};

type MemberOption = { id: string; label: string; memberCategory?: string };

const PASTOR_ONLY_KEYS = new Set<keyof LeadershipState>([
  'superintendent',
  'viceSuperintendent',
  'conferenceMinister1',
  'conferenceMinister2',
]);

const LAY_MEMBER_KEYS = new Set<keyof LeadershipState>([
  'moderator',
  'viceModerator',
  'secretary',
  'viceSecretary',
  'treasurer',
  'viceTreasurer',
]);

function normCat(c?: string) {
  return String(c || 'MEMBER').toUpperCase();
}

function memberRefId(value: string | { _id?: string } | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id || '';
}

function memberOptionsForField(
  key: keyof LeadershipState,
  all: MemberOption[],
  selectedId: string
): MemberOption[] {
  const filtered = all.filter((m) => {
    const cat = normCat(m.memberCategory);
    if (PASTOR_ONLY_KEYS.has(key)) return cat === 'PASTOR';
    if (LAY_MEMBER_KEYS.has(key)) return cat !== 'PASTOR';
    return true;
  });
  const sel = all.find((m) => m.id === selectedId);
  if (selectedId && sel && !filtered.some((m) => m.id === selectedId)) {
    return [...filtered, sel];
  }
  return filtered;
}

const LEADERSHIP_FIELDS: Array<{ key: keyof LeadershipState; label: string }> = [
  { key: 'superintendent', label: 'Substantive supt (pastor only)' },
  { key: 'viceSuperintendent', label: 'Vice supt (pastor only)' },
  { key: 'moderator', label: 'Moderator (member only)' },
  { key: 'viceModerator', label: 'Vice moderator (member only)' },
  { key: 'secretary', label: 'Secretary (member only)' },
  { key: 'viceSecretary', label: 'Vice secretary (member only)' },
  { key: 'treasurer', label: 'Treasurer (member only)' },
  { key: 'viceTreasurer', label: 'Vice treasurer (member only)' },
  { key: 'conferenceMinister1', label: 'Conference minister 1 (pastor only)' },
  { key: 'conferenceMinister2', label: 'Conference minister 2 (pastor only)' },
];

const emptyLeadership = (): LeadershipState => ({
  superintendent: '',
  viceSuperintendent: '',
  moderator: '',
  viceModerator: '',
  secretary: '',
  viceSecretary: '',
  treasurer: '',
  viceTreasurer: '',
  conferenceMinister1: '',
  conferenceMinister2: '',
});

function leadershipFromConference(row: ConferenceRow | null): LeadershipState {
  if (!row?.localLeadership) return emptyLeadership();
  const l = row.localLeadership;
  return {
    superintendent: memberRefId(l.superintendent),
    viceSuperintendent: memberRefId(l.viceSuperintendent),
    moderator: memberRefId(l.moderator),
    viceModerator: memberRefId(l.viceModerator),
    secretary: memberRefId(l.secretary),
    viceSecretary: memberRefId(l.viceSecretary),
    treasurer: memberRefId(l.treasurer),
    viceTreasurer: memberRefId(l.viceTreasurer),
    conferenceMinister1: memberRefId(l.conferenceMinister1),
    conferenceMinister2: memberRefId(l.conferenceMinister2),
  };
}

export type ConferenceLeadershipModalProps = {
  open: boolean;
  onClose: () => void;
  conferenceId: string;
  conferenceName: string;
  token: string | null;
  onSaved: () => void;
};

export function conferenceLeadershipSummary(
  row: { localLeadership?: Partial<Record<string, string | { _id?: string } | null | undefined>> } | null
): string {
  if (!row?.localLeadership) return 'Not set';
  const l = row.localLeadership;
  const keys = LEADERSHIP_FIELDS.map((f) => f.key);
  const filled = keys.filter((k) => memberRefId(l[k])).length;
  return filled ? `${filled} role(s) assigned` : 'Not set';
}

export function ConferenceLeadershipModal({
  open,
  onClose,
  conferenceId,
  conferenceName,
  token,
  onSaved,
}: ConferenceLeadershipModalProps) {
  const [leadership, setLeadership] = useState<LeadershipState>(emptyLeadership);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !conferenceId) return;
    setLoadErr(null);
    setLoading(true);
    try {
      type UserRow = {
        id: string;
        fullName?: string;
        email: string;
        memberId?: string;
        memberCategory?: string;
      };
      const [conf, raw] = await Promise.all([
        apiFetch<ConferenceRow>(`/api/superadmin/conferences/${conferenceId}`, { token }),
        apiFetch<UserRow[] | Paginated<UserRow>>(
          `/api/superadmin/users?role=ALL&conferenceId=${encodeURIComponent(conferenceId)}&limit=500`,
          { token }
        ),
      ]);
      setLeadership(leadershipFromConference(conf));
      const members = unwrapPaginatedArray(raw);
      setMemberOptions(
        members.map((m) => ({
          id: m.id,
          memberCategory: m.memberCategory,
          label: `${m.memberId ? `${m.memberId} — ` : ''}${(m.fullName || m.email || '').trim()}`,
        }))
      );
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token, conferenceId]);

  useEffect(() => {
    if (!open || !conferenceId || !token) return;
    void load();
  }, [open, conferenceId, token, load]);

  useEffect(() => {
    if (!open) {
      setErr(null);
      setLoadErr(null);
    }
  }, [open]);

  async function onSave() {
    if (!token || !conferenceId) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/superadmin/conferences/${conferenceId}/leadership`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ localLeadership: leadership }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[1px]">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conference-leadership-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Conference leadership</p>
            <h2 id="conference-leadership-title" className="text-lg font-semibold text-neutral-900">
              {conferenceName}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Assign conference officers from members linked to congregations in this conference (same rules as the edit
              conference page).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-8 animate-spin text-violet-600" />
            </div>
          ) : null}
          {loadErr ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadErr}</p>
          ) : null}

          {!loading && !loadErr ? (
            <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Roles</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {LEADERSHIP_FIELDS.map((item) => (
                  <div key={item.key}>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">{item.label}</label>
                    <select
                      value={leadership[item.key]}
                      onChange={(e) => setLeadership((prev) => ({ ...prev, [item.key]: e.target.value }))}
                      className={field}
                    >
                      <option value="">— None —</option>
                      {memberOptionsForField(item.key, memberOptions, leadership[item.key]).map((m) => (
                        <option key={`${item.key}-${m.id}`} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3">
          {err ? (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || loading || Boolean(loadErr)}
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
  );
}

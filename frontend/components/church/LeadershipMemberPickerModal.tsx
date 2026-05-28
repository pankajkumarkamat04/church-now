'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { apiFetch, type AuthUser, type Paginated, unwrapPaginatedArray } from '@/lib/api';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100';

export type LeadershipMemberOption = {
  id: string;
  label: string;
  memberCategory?: string;
  churchName?: string;
  churchId?: string;
  conferenceId?: string;
};

type ConferenceOption = { _id: string; name: string };
type ChurchOption = {
  _id: string;
  name: string;
  churchType?: string;
  conference?: string | { _id?: string } | null;
};

type RosterUser = AuthUser & { _id?: string };

function churchRefsFromUser(u: RosterUser): { churchId: string; conferenceId: string; churchName: string } {
  const church = u.church;
  if (!church || typeof church === 'string') {
    return { churchId: typeof church === 'string' ? church : '', conferenceId: '', churchName: '' };
  }
  const churchId = String(church._id || '');
  const churchName = church.name || '';
  const conf = (church as { conference?: string | { _id?: string } | null }).conference;
  const conferenceId =
    conf && typeof conf === 'object' ? String(conf._id || '') : conf ? String(conf) : '';
  return { churchId, conferenceId, churchName };
}

function conferenceIdFromChurch(c: ChurchOption): string {
  if (!c.conference) return '';
  return typeof c.conference === 'string' ? c.conference : String(c.conference._id || '');
}

export function mapUserToLeadershipOption(u: RosterUser): LeadershipMemberOption {
  const userId = String(u.id || u._id || '');
  const name = (u.fullName || `${u.firstName || ''} ${u.surname || ''}`.trim() || u.email || userId).trim();
  const mid = u.memberId ? String(u.memberId) : '';
  const { churchId, conferenceId, churchName } = churchRefsFromUser(u);
  const base = mid ? `${mid} — ${name}` : name;
  return {
    id: userId,
    memberCategory: u.memberCategory,
    churchId,
    conferenceId,
    churchName,
    label: churchName ? `${base} (${churchName})` : base,
  };
}

export type LeadershipPickerPool = 'pastors' | 'lay';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (option: LeadershipMemberOption) => void;
  token: string | null;
  title: string;
  description?: string;
  /** Main church: all denomination members; optional conference/church filters. Sub-church: one congregation. */
  filterMode: 'main' | 'fixed-church';
  fixedChurchId?: string;
  fixedChurchName?: string;
  pool: LeadershipPickerPool;
  selectedId?: string;
};

export function LeadershipMemberPickerModal({
  open,
  onClose,
  onSelect,
  token,
  title,
  description,
  filterMode,
  fixedChurchId,
  fixedChurchName,
  pool,
  selectedId,
}: Props) {
  const [conferences, setConferences] = useState<ConferenceOption[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [search, setSearch] = useState('');
  const [allMembers, setAllMembers] = useState<LeadershipMemberOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isMain = filterMode === 'main';

  const churchesForFilter = useMemo(() => {
    if (!isMain) return [];
    const subs = churches.filter((c) => c.churchType !== 'MAIN');
    if (!conferenceId) return subs;
    return subs.filter((c) => conferenceIdFromChurch(c) === conferenceId);
  }, [isMain, churches, conferenceId]);

  const loadMainRoster = useCallback(async () => {
    if (!token || !open || !isMain) return;
    setLoadingMembers(true);
    setErr(null);
    try {
      let rows: RosterUser[] = [];
      const raw = await apiFetch<RosterUser[]>(`/api/superadmin/leadership-roster?pool=${pool}`, { token });
      rows = Array.isArray(raw) ? raw : [];

      if (rows.length === 0) {
        const params = new URLSearchParams({
          role: 'ALL',
          isActive: 'true',
          limit: '3000',
          memberCategory: pool === 'pastors' ? 'PASTOR' : 'LAY',
        });
        const fallback = await apiFetch<RosterUser[] | Paginated<RosterUser>>(
          `/api/superadmin/users?${params.toString()}`,
          { token }
        );
        rows = unwrapPaginatedArray(fallback);
      }

      setAllMembers(rows.map(mapUserToLeadershipOption).filter((m) => m.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load members');
      setAllMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [token, open, isMain, pool]);

  const loadFixedChurchMembers = useCallback(async () => {
    if (!token || !open || isMain || !fixedChurchId) return;
    setLoadingMembers(true);
    setErr(null);
    try {
      const params = new URLSearchParams({
        role: 'ALL',
        isActive: 'true',
        limit: '500',
        churchId: fixedChurchId,
        memberCategory: pool === 'pastors' ? 'PASTOR' : 'LAY',
      });
      const raw = await apiFetch<AuthUser[] | Paginated<AuthUser>>(
        `/api/superadmin/users?${params.toString()}`,
        { token }
      );
      setAllMembers(unwrapPaginatedArray(raw).map(mapUserToLeadershipOption));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load members');
      setAllMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [token, open, isMain, fixedChurchId, pool]);

  const loadReferences = useCallback(async () => {
    if (!token || !open || !isMain) return;
    setLoadingRefs(true);
    try {
      const [confRaw, churchRaw] = await Promise.all([
        apiFetch<ConferenceOption[] | Paginated<ConferenceOption>>(
          '/api/superadmin/conferences?limit=500',
          { token }
        ),
        apiFetch<ChurchOption[]>('/api/superadmin/sub-churches', { token }),
      ]);
      setConferences(unwrapPaginatedArray(confRaw));
      setChurches(Array.isArray(churchRaw) ? churchRaw : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load filters');
    } finally {
      setLoadingRefs(false);
    }
  }, [token, open, isMain]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setConferenceId('');
    setChurchId('');
    setAllMembers([]);
    setErr(null);
    if (isMain) {
      void loadReferences();
      void loadMainRoster();
    } else {
      void loadFixedChurchMembers();
    }
  }, [open, isMain, loadReferences, loadMainRoster, loadFixedChurchMembers]);

  useEffect(() => {
    if (!open || !isMain) return;
    setChurchId('');
  }, [open, isMain, conferenceId]);

  const scopedMembers = useMemo(() => {
    if (!isMain) return allMembers;
    let rows = allMembers;
    if (conferenceId) {
      rows = rows.filter((m) => m.conferenceId === conferenceId);
    }
    if (churchId) {
      rows = rows.filter((m) => m.churchId === churchId);
    }
    return rows;
  }, [allMembers, isMain, conferenceId, churchId]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedMembers;
    return scopedMembers.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        (m.churchName || '').toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  }, [scopedMembers, search]);

  if (!open) return null;

  const canListMembers = isMain ? allMembers.length > 0 || loadingMembers : Boolean(fixedChurchId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-[1px]">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leadership-picker-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div className="min-w-0">
            <h2 id="leadership-picker-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          ) : null}

          {isMain ? (
            <>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                All active congregation members in the system are listed below (including those registered at any
                church). Use optional filters to narrow by conference or church.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Filter by conference (optional)
                  </label>
                  <select
                    value={conferenceId}
                    onChange={(e) => setConferenceId(e.target.value)}
                    className={field}
                    disabled={loadingRefs}
                  >
                    <option value="">All conferences</option>
                    {conferences.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Filter by church (optional)
                  </label>
                  <select
                    value={churchId}
                    onChange={(e) => setChurchId(e.target.value)}
                    className={field}
                    disabled={loadingRefs}
                  >
                    <option value="">All churches</option>
                    {churchesForFilter.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Congregation: <span className="font-medium text-neutral-900 dark:text-neutral-100">{fixedChurchName || '—'}</span>
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Search member
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, member ID, or church…"
                className={`${field} pl-9`}
                disabled={!canListMembers && !loadingMembers}
              />
            </div>
            {isMain && allMembers.length > 0 ? (
              <p className="mt-1 text-[11px] text-neutral-500">
                Showing {filteredMembers.length} of {scopedMembers.length} members
                {scopedMembers.length !== allMembers.length ? ` (${allMembers.length} total in system)` : ''}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700">
            {loadingMembers ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-7 animate-spin text-violet-600" />
              </div>
            ) : !canListMembers ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No members available.</p>
            ) : filteredMembers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">
                {allMembers.length === 0
                  ? `No active ${pool === 'pastors' ? 'pastors' : 'lay members'} found in the system.`
                  : scopedMembers.length === 0
                    ? 'No members match the selected conference or church filters. Try clearing filters above.'
                    : 'No members match your search.'}
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
                {filteredMembers.map((m) => {
                  const isSelected = selectedId === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(m);
                          onClose();
                        }}
                        className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm transition hover:bg-violet-50 dark:hover:bg-violet-950/40 ${
                          isSelected ? 'bg-violet-50/80 dark:bg-violet-950/30' : ''
                        }`}
                      >
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{m.label}</span>
                        {m.memberCategory ? (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                            {m.memberCategory}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-950/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

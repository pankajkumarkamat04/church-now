'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Users, X } from 'lucide-react';
import { apiFetch, type AuthUser } from '@/lib/api';
import type { ChurchCouncil, ChurchRecord, LocalLeadership } from '@/app/dashboard/superadmin/churches/types';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type MemberOption = { id: string; label: string };

type CouncilRowState = {
  clientKey: string;
  name: string;
  roles: Array<{ clientKey: string; roleKey: string; roleLabel: string; memberId: string }>;
};

function memberRefId(value: string | { _id?: string } | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id || '';
}

function leadershipFromRecord(row: ChurchRecord | null): LocalLeadership {
  if (!row?.localLeadership) return {};
  return row.localLeadership;
}

function councilsFromRecord(row: ChurchRecord | null): CouncilRowState[] {
  const list = row?.councils;
  if (!Array.isArray(list)) return [];
  return list.map((c) => ({
    clientKey: c._id || `c-${Math.random().toString(36).slice(2)}`,
    name: c.name || '',
    roles: (c.roles || []).map((r) => ({
      clientKey: `r-${Math.random().toString(36).slice(2)}`,
      roleKey: r.roleKey || '',
      roleLabel: r.roleLabel || r.roleKey || '',
      memberId: memberRefId(r.member),
    })),
  }));
}

const LOCAL_ROLE_LABELS: Record<string, string> = {
  spiritualPastor: 'Spiritual pastor (calling)',
  deacon: 'Deacon (elected)',
  viceDeacon: 'Vice deacon',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
};

const LOCAL_SINGLE_KEYS = [
  'spiritualPastor',
  'deacon',
  'viceDeacon',
  'secretary',
  'viceSecretary',
  'treasurer',
] as const;

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
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [singleRoles, setSingleRoles] = useState<Record<(typeof LOCAL_SINGLE_KEYS)[number], string>>({
    spiritualPastor: '',
    deacon: '',
    viceDeacon: '',
    secretary: '',
    viceSecretary: '',
    treasurer: '',
  });
  const [committeeIds, setCommitteeIds] = useState<string[]>([]);
  const [councils, setCouncils] = useState<CouncilRowState[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const memberSelectOptions = useMemo(() => [{ id: '', label: '— None —' }, ...members], [members]);

  const loadMembers = useCallback(async () => {
    if (!token || !churchId) return;
    setLoadErr(null);
    const rows = await apiFetch<AuthUser[]>(
      `/api/superadmin/users?role=MEMBER&churchId=${encodeURIComponent(churchId)}`,
      { token }
    );
    setMembers(
      rows.map((u) => {
        const name = (u.fullName || `${u.firstName || ''} ${u.surname || ''}`.trim() || u.email || u.id).trim();
        const mid = u.memberId ? String(u.memberId) : '';
        return {
          id: u.id,
          label: mid ? `${mid} — ${name}` : name,
        };
      })
    );
  }, [token, churchId]);

  useEffect(() => {
    if (!open || !token || !churchId) return;
    loadMembers().catch((e) => setLoadErr(e instanceof Error ? e.message : 'Failed to load members'));
  }, [open, token, churchId, loadMembers]);

  useEffect(() => {
    if (!open || !row) return;
    const l = leadershipFromRecord(row);
    setSingleRoles({
      spiritualPastor: memberRefId(l.spiritualPastor),
      deacon: memberRefId(l.deacon),
      viceDeacon: memberRefId(l.viceDeacon),
      secretary: memberRefId(l.secretary),
      viceSecretary: memberRefId(l.viceSecretary),
      treasurer: memberRefId(l.treasurer),
    });
    const committee = l.committeeMembers;
    if (Array.isArray(committee)) {
      setCommitteeIds(committee.map((m) => memberRefId(m)).filter(Boolean));
    } else {
      setCommitteeIds([]);
    }
    setCouncils(councilsFromRecord(row));
    setErr(null);
  }, [open, row]);

  function toggleCommittee(id: string) {
    setCommitteeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addCouncil() {
    setCouncils((prev) => [
      ...prev,
      {
        clientKey: `c-${Date.now()}`,
        name: '',
        roles: [
          {
            clientKey: `r-${Date.now()}`,
            roleKey: `chair-${Date.now()}`,
            roleLabel: 'Chairperson',
            memberId: '',
          },
        ],
      },
    ]);
  }

  function removeCouncil(key: string) {
    setCouncils((prev) => prev.filter((c) => c.clientKey !== key));
  }

  function updateCouncilName(key: string, name: string) {
    setCouncils((prev) => prev.map((c) => (c.clientKey === key ? { ...c, name } : c)));
  }

  function addRoleRow(councilKey: string) {
    setCouncils((prev) =>
      prev.map((c) =>
        c.clientKey === councilKey
          ? {
              ...c,
              roles: [
                ...c.roles,
                {
                  clientKey: `r-${Date.now()}`,
                  roleKey: `role-${Date.now()}`,
                  roleLabel: '',
                  memberId: '',
                },
              ],
            }
          : c
      )
    );
  }

  function removeRoleRow(councilKey: string, roleKey: string) {
    setCouncils((prev) =>
      prev.map((c) =>
        c.clientKey === councilKey ? { ...c, roles: c.roles.filter((r) => r.clientKey !== roleKey) } : c
      )
    );
  }

  function updateRole(
    councilKey: string,
    roleClientKey: string,
    patch: Partial<{ roleLabel: string; memberId: string; roleKey: string }>
  ) {
    setCouncils((prev) =>
      prev.map((c) => {
        if (c.clientKey !== councilKey) return c;
        return {
          ...c,
          roles: c.roles.map((r) => (r.clientKey === roleClientKey ? { ...r, ...patch } : r)),
        };
      })
    );
  }

  async function onSave() {
    if (!token) return;
    setErr(null);
    for (const c of councils) {
      if (!c.name.trim()) {
        setErr('Each council must have a name before saving.');
        return;
      }
    }
    setBusy(true);
    try {
      const localLeadership = {
        spiritualPastor: singleRoles.spiritualPastor || null,
        deacon: singleRoles.deacon || null,
        viceDeacon: singleRoles.viceDeacon || null,
        secretary: singleRoles.secretary || null,
        viceSecretary: singleRoles.viceSecretary || null,
        treasurer: singleRoles.treasurer || null,
        committeeMembers: committeeIds,
      };
      const councilsPayload: ChurchCouncil[] = councils.map((c) => ({
        name: c.name.trim(),
        roles: c.roles.map((r) => ({
          roleKey: (r.roleKey || r.roleLabel || 'role').trim() || `role-${r.clientKey}`,
          roleLabel: (r.roleLabel || r.roleKey || 'Role').trim(),
          member: r.memberId || null,
        })),
      }));

      const endpoint =
        churchType === 'SUB' ? `/api/superadmin/sub-churches/${churchId}` : `/api/superadmin/main-churches/${churchId}`;
      await apiFetch(endpoint, {
        method: 'PUT',
        token,
        body: JSON.stringify({ localLeadership, councils: councilsPayload }),
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
        aria-labelledby="church-leadership-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Church leadership</p>
            <h2 id="church-leadership-title" className="text-lg font-semibold text-neutral-900">
              {churchName}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Assign leaders from members of this congregation. Local roles are elected or called; each council can
              define its own committee structure.
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
          {loadErr ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadErr}</p>
          ) : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900">Local church leadership</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {LOCAL_SINGLE_KEYS.map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">{LOCAL_ROLE_LABELS[key]}</label>
                  <select
                    value={singleRoles[key]}
                    onChange={(e) => setSingleRoles((s) => ({ ...s, [key]: e.target.value }))}
                    className={field}
                  >
                    {memberSelectOptions.map((m) => (
                      <option key={`${key}-${m.id || 'none'}`} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-600">Committee members (elected)</label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                {members.length === 0 ? (
                  <p className="text-sm text-neutral-500">No members at this church yet.</p>
                ) : (
                  members.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                      <input
                        type="checkbox"
                        checked={committeeIds.includes(m.id)}
                        onChange={() => toggleCommittee(m.id)}
                        className="size-4 rounded border-neutral-300 text-violet-600"
                      />
                      {m.label}
                    </label>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">Councils</h3>
              <button
                type="button"
                onClick={addCouncil}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100"
              >
                <Plus className="size-3.5" />
                Add council
              </button>
            </div>

            {councils.length === 0 ? (
              <p className="text-sm text-neutral-500">No councils yet. Add one and define roles (e.g. chairperson, secretary).</p>
            ) : (
              <div className="space-y-4">
                {councils.map((council) => (
                  <div key={council.clientKey} className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <input
                        value={council.name}
                        onChange={(e) => updateCouncilName(council.clientKey, e.target.value)}
                        placeholder="Council name"
                        className={field}
                      />
                      <button
                        type="button"
                        onClick={() => removeCouncil(council.clientKey)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" />
                        Remove council
                      </button>
                    </div>
                    <div className="space-y-2">
                      {council.roles.map((role) => (
                        <div key={role.clientKey} className="flex flex-wrap items-end gap-2 rounded-lg bg-white p-2 ring-1 ring-neutral-200/80">
                          <div className="min-w-[140px] flex-1">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                              Role title
                            </label>
                            <input
                              value={role.roleLabel}
                              onChange={(e) =>
                                updateRole(council.clientKey, role.clientKey, { roleLabel: e.target.value })
                              }
                              placeholder="e.g. Vice chairperson"
                              className={field}
                            />
                          </div>
                          <div className="min-w-[180px] flex-1">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                              Member
                            </label>
                            <select
                              value={role.memberId}
                              onChange={(e) =>
                                updateRole(council.clientKey, role.clientKey, { memberId: e.target.value })
                              }
                              className={field}
                            >
                              {memberSelectOptions.map((m) => (
                                <option key={`${role.clientKey}-${m.id || 'n'}`} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoleRow(council.clientKey, role.clientKey)}
                            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                            aria-label="Remove role"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addRoleRow(council.clientKey)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
                    >
                      <Plus className="size-3.5" />
                      Add role row
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
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
  );
}

export function leadershipSummary(row: ChurchRecord | null): string {
  if (!row?.localLeadership) return 'Not set';
  const l = row.localLeadership;
  const filled = LOCAL_SINGLE_KEYS.filter((k) => memberRefId(l[k])).length;
  const committee = Array.isArray(l.committeeMembers) ? l.committeeMembers.length : 0;
  const councils = row.councils?.length || 0;
  const parts: string[] = [];
  if (filled) parts.push(`${filled} local role(s)`);
  if (committee) parts.push(`${committee} committee`);
  if (councils) parts.push(`${councils} council(s)`);
  return parts.length ? parts.join(' · ') : 'Not set';
}

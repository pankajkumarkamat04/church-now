'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Loader2,
  Building2,
  ChevronDown,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Users,
  UserCog,
  Briefcase,
  Layers,
  CalendarClock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessMemberPortal } from '@/lib/dashboardRouting';

type PersonSummary = {
  id: string;
  fullName: string;
  email: string;
  memberId: string;
  contactPhone?: string;
} | null;

type LeadershipSlot = { key: string; label: string; person: PersonSummary };

type ChurchCouncilRow = {
  name: string;
  roles: Array<{ roleKey: string; roleLabel: string; member: PersonSummary }>;
};

type ServiceRow = {
  name: string;
  isActive: boolean;
  head: PersonSummary;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type ServiceCouncilBlock = {
  name: string;
  description: string;
  isActive: boolean;
  services: ServiceRow[];
};

type PastoralAssignment = {
  pastor: PersonSummary;
  termStatus: string;
  termNumber?: number;
  termStart: string | null;
  termEnd: string | null;
} | null;

type ChurchDetail = {
  _id: string;
  name: string;
  churchType: string;
  isActive: boolean;
  address: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  mainChurch: { _id: string; name: string; churchType: string } | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  leadership: LeadershipSlot[];
  committeeMembers: NonNullable<PersonSummary>[];
  councils: ChurchCouncilRow[];
  serviceCouncils: ServiceCouncilBlock[];
  memberStats: { membersTotal: number; membersActive: number; churchAdmins: number };
  pastoralAssignment: PastoralAssignment;
};

type ConferenceBlock = {
  conference: {
    _id: string;
    name: string;
    conferenceId?: string;
    description?: string;
    email?: string;
    phone?: string;
    officeAddress?: string;
    city?: string;
    stateOrProvince?: string;
    postalCode?: string;
    country?: string;
    isActive?: boolean;
    /** Only office slots assigned to you (not the full conference roster). */
    localLeadership: Partial<Record<string, PersonSummary>>;
  };
  myRoles: Array<{ key: string; label: string }>;
  churches: ChurchDetail[];
  churchCount: number;
};

type OverviewPayload = { conferences: ConferenceBlock[] };

/** Matches backend `CONFERENCE_LEADERSHIP_LABELS` for conference document slots. */
const CONFERENCE_OFFICE_LABELS: Record<string, string> = {
  superintendent: 'Substantive superintendent',
  viceSuperintendent: 'Vice superintendent',
  moderator: 'Moderator',
  viceModerator: 'Vice moderator',
  secretary: 'Secretary',
  viceSecretary: 'Vice secretary',
  treasurer: 'Treasurer',
  viceTreasurer: 'Vice treasurer',
  conferenceMinister1: 'Conference minister (1)',
  conferenceMinister2: 'Conference minister (2)',
};

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function PersonCard({
  person,
  accentClass,
}: {
  person: NonNullable<PersonSummary>;
  accentClass: string;
}) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900/80`}>
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{person.fullName || '—'}</p>
      {person.memberId ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Member ID: {person.memberId}</p>
      ) : null}
      {person.email ? (
        <a href={`mailto:${person.email}`} className={`text-xs ${accentClass}`}>
          {person.email}
        </a>
      ) : null}
      {person.contactPhone ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{person.contactPhone}</p> : null}
    </div>
  );
}

export function ConferencePanelPage() {
  const pathname = usePathname();
  const inConferenceLeaderShell = pathname.startsWith('/dashboard/conference-leader');
  const legacyBackHref = pathname.startsWith('/dashboard/admin') ? '/dashboard/admin' : '/dashboard/member';
  const accentLink = inConferenceLeaderShell
    ? 'text-indigo-700 hover:underline dark:text-indigo-400'
    : 'text-emerald-700 hover:underline dark:text-emerald-400';

  const { token, user, refreshUser } = useAuth();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  /** Which congregation row is expanded for full detail (church _id). */
  const [openChurchId, setOpenChurchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    try {
      await refreshUser();
      const res = await apiFetch<OverviewPayload>('/api/conference-panel/overview', { token });
      setData(res);
      if (res.conferences?.length === 1) {
        setOpenId(res.conferences[0].conference._id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load conference panel');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, refreshUser]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400">
        <Loader2 className="size-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        Loading conference overview…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        <p className="font-medium">{err}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-2 text-sm font-medium text-red-900 underline hover:no-underline dark:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  const blocks = data?.conferences ?? [];
  const hasRows = blocks.length > 0;
  if (!hasRows && !user?.isConferenceLeader) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-300">
        <p className="text-sm">
          You are not listed on conference leadership for any conference. If this changed recently, refresh your session or
          contact a superadmin.
        </p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!hasRows) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-sm font-medium">No conference data returned.</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 text-sm font-semibold underline hover:no-underline dark:text-amber-200"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            inConferenceLeaderShell ? 'text-indigo-800 dark:text-indigo-300' : 'text-emerald-700 dark:text-emerald-400'
          }`}
        >
          Conference leadership
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Conference overview</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Your conference scope only: office assignment(s) on record for you, church listings and aggregates in conferences where you
          serve, and detailed contact info only for your own roles. Other leaders’ emails and phones are not shown.
        </p>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => {
          const c = block.conference;
          const expanded = openId === c._id;
          const addrLine = [c.officeAddress, c.city, c.stateOrProvince, c.postalCode, c.country].filter(Boolean).join(', ');
          return (
            <div
              key={c._id}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:shadow-none"
            >
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : c._id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/80"
              >
                <span className="mt-0.5 text-neutral-400 dark:text-neutral-500">
                  {expanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2
                      className={`size-5 shrink-0 ${inConferenceLeaderShell ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                      aria-hidden
                    />
                    <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</span>
                    {c.conferenceId ? (
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {c.conferenceId}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Your roles:{' '}
                    {block.myRoles.length > 0 ? block.myRoles.map((r) => r.label).join(', ') : '—'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{block.churchCount} congregation(s)</p>
                </div>
              </button>

              {expanded ? (
                <div className="space-y-6 border-t border-neutral-100 bg-neutral-50/50 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-950/40">
                  {c.description ? <p className="text-sm text-neutral-700 dark:text-neutral-300">{c.description}</p> : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {c.email ? (
                      <div className="flex items-start gap-2 text-sm">
                        <Mail className="mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                        <a href={`mailto:${c.email}`} className={accentLink}>
                          {c.email}
                        </a>
                      </div>
                    ) : null}
                    {c.phone ? (
                      <div className="flex items-start gap-2 text-sm">
                        <Phone className="mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                        <span className="text-neutral-800 dark:text-neutral-200">{c.phone}</span>
                      </div>
                    ) : null}
                    {addrLine ? (
                      <div className="flex items-start gap-2 text-sm sm:col-span-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                        <span className="text-neutral-800 dark:text-neutral-200">{addrLine}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Only this viewer’s conference-office slots (not the full roster). */}
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      <Briefcase className="size-3.5" aria-hidden />
                      Your conference office assignment(s)
                    </p>
                    {Object.keys(c.localLeadership).length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(Object.entries(c.localLeadership) as Array<[string, PersonSummary]>).map(([key, person]) =>
                          person ? (
                            <div
                              key={key}
                              className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/40"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-300">
                                {CONFERENCE_OFFICE_LABELS[key] || key}
                              </p>
                              <div className="mt-2">
                                <PersonCard person={person} accentClass={accentLink} />
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    ) : block.myRoles.length > 0 ? (
                      <ul className="list-inside list-disc text-sm text-neutral-700 dark:text-neutral-300">
                        {block.myRoles.map((r) => (
                          <li key={r.key}>{r.label}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No conference office slot on file for your account in this conference.
                      </p>
                    )}
                  </section>

                  {/* Congregations */}
                  <section>
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      <Layers className="size-3.5" aria-hidden />
                      Congregations &amp; church details
                    </p>
                    <div className="space-y-2">
                      {block.churches.map((ch) => {
                        const loc = [ch.address, ch.city, ch.stateOrProvince, ch.postalCode, ch.country].filter(Boolean).join(', ');
                        const churchOpen = openChurchId === ch._id;
                        return (
                          <div
                            key={ch._id}
                            className={`overflow-hidden rounded-xl border bg-white dark:bg-neutral-900/50 ${
                              ch.isActive === false
                                ? 'border-neutral-200 opacity-75 dark:border-neutral-700'
                                : 'border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenChurchId(churchOpen ? null : ch._id)}
                              className="flex w-full items-start gap-2 px-3 py-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/70"
                            >
                              <span className="mt-0.5 shrink-0 text-neutral-400">
                                {churchOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{ch.name}</span>
                                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                    {ch.churchType}
                                  </span>
                                  {ch.isActive === false ? (
                                    <span className="text-[10px] font-medium uppercase text-amber-700 dark:text-amber-400">
                                      Inactive
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="size-3.5" aria-hidden />
                                    {ch.memberStats.membersActive} active / {ch.memberStats.membersTotal} members
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <UserCog className="size-3.5" aria-hidden />
                                    {ch.memberStats.churchAdmins} admin(s)
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-xs text-neutral-500">{loc || 'No address on file'}</p>
                              </div>
                            </button>

                            {churchOpen ? (
                              <div className="space-y-4 border-t border-neutral-100 px-3 pb-4 pt-3 dark:border-neutral-700">
                                {/* Location & contact */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 text-sm dark:border-neutral-600 dark:bg-neutral-950/50">
                                    <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                                      Address
                                    </p>
                                    <p className="mt-1 text-neutral-800 dark:text-neutral-200">{loc || '—'}</p>
                                    {ch.latitude != null && ch.longitude != null ? (
                                      <p className="mt-1 text-xs text-neutral-500">
                                        Coordinates: {ch.latitude.toFixed(5)}, {ch.longitude.toFixed(5)}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 text-sm dark:border-neutral-600 dark:bg-neutral-950/50">
                                    <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                                      Church contact
                                    </p>
                                    {ch.phone ? (
                                      <p className="mt-1 flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                        <Phone className="size-3.5 shrink-0 opacity-70" />
                                        {ch.phone}
                                      </p>
                                    ) : null}
                                    {ch.email ? (
                                      <p className="mt-1 flex items-center gap-2">
                                        <Mail className="size-3.5 shrink-0 opacity-70" />
                                        <a href={`mailto:${ch.email}`} className={accentLink}>
                                          {ch.email}
                                        </a>
                                      </p>
                                    ) : null}
                                    {!ch.phone && !ch.email ? <p className="mt-1 text-neutral-500">—</p> : null}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                                  {ch.mainChurch ? (
                                    <span>
                                      Main church: <strong className="text-neutral-700 dark:text-neutral-300">{ch.mainChurch.name}</strong>{' '}
                                      ({ch.mainChurch.churchType})
                                    </span>
                                  ) : (
                                    <span>Main church: —</span>
                                  )}
                                  {ch.createdAt ? <span>Record created {fmtShortDate(ch.createdAt)}</span> : null}
                                </div>

                                {/* Pastoral assignment */}
                                {ch.pastoralAssignment?.pastor ? (
                                  <div>
                                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                      <CalendarClock className="size-3.5" aria-hidden />
                                      Pastoral assignment (active term)
                                    </p>
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                      <PersonCard person={ch.pastoralAssignment.pastor} accentClass={accentLink} />
                                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                                        Status: {ch.pastoralAssignment.termStatus || '—'} · Term #{ch.pastoralAssignment.termNumber ?? '—'}{' '}
                                        · {fmtShortDate(ch.pastoralAssignment.termStart)} → {fmtShortDate(ch.pastoralAssignment.termEnd)}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No active pastoral term on file.</p>
                                )}

                                {/* Local leadership roster */}
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                    Congregation leadership roster
                                  </p>
                                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {ch.leadership.map((slot) => (
                                      <div
                                        key={slot.key}
                                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 dark:border-neutral-600 dark:bg-neutral-900/80"
                                      >
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                          {slot.label}
                                        </p>
                                        {slot.person ? (
                                          <div className="mt-1">
                                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                              {slot.person.fullName}
                                            </p>
                                            {slot.person.memberId ? (
                                              <p className="text-[11px] text-neutral-500">ID {slot.person.memberId}</p>
                                            ) : null}
                                            {slot.person.email ? (
                                              <a href={`mailto:${slot.person.email}`} className={`text-xs ${accentLink}`}>
                                                {slot.person.email}
                                              </a>
                                            ) : null}
                                            {slot.person.contactPhone ? (
                                              <p className="text-xs text-neutral-600 dark:text-neutral-400">{slot.person.contactPhone}</p>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <p className="mt-1 text-sm text-neutral-400">Vacant</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Committee */}
                                {ch.committeeMembers.length > 0 ? (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                      Committee members
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {ch.committeeMembers.map((p) => (
                                        <PersonCard key={p.id} person={p} accentClass={accentLink} />
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Church councils */}
                                {ch.councils.length > 0 ? (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                      Church councils
                                    </p>
                                    <div className="space-y-3">
                                      {ch.councils.map((council, ci) => (
                                        <div
                                          key={`${ch._id}-council-${ci}`}
                                          className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-600 dark:bg-neutral-950/40"
                                        >
                                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{council.name}</p>
                                          <ul className="mt-2 space-y-2">
                                            {council.roles.map((r) => (
                                              <li key={`${council.name}-${r.roleKey}-${r.member?.id || 'x'}`} className="text-sm">
                                                <span className="text-neutral-600 dark:text-neutral-400">{r.roleLabel}: </span>
                                                {r.member ? (
                                                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                                    {r.member.fullName}
                                                    {r.member.memberId ? ` (${r.member.memberId})` : ''}
                                                  </span>
                                                ) : (
                                                  <span className="text-neutral-400">—</span>
                                                )}
                                                {r.member?.email ? (
                                                  <>
                                                    {' '}
                                                    <a href={`mailto:${r.member.email}`} className={`text-xs ${accentLink}`}>
                                                      {r.member.email}
                                                    </a>
                                                  </>
                                                ) : null}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Service councils */}
                                {ch.serviceCouncils.length > 0 ? (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                      Service councils &amp; ministries
                                    </p>
                                    <div className="space-y-4">
                                      {ch.serviceCouncils.map((sc, si) => (
                                        <div
                                          key={`${ch._id}-svc-${si}`}
                                          className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-900/60"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{sc.name}</span>
                                            {!sc.isActive ? (
                                              <span className="text-[10px] uppercase text-amber-700 dark:text-amber-400">Inactive</span>
                                            ) : null}
                                          </div>
                                          {sc.description ? (
                                            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{sc.description}</p>
                                          ) : null}
                                          <ul className="mt-3 space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-700">
                                            {sc.services.map((svc, vi) => (
                                              <li key={`${ch._id}-${si}-${vi}`} className="text-sm">
                                                <span className="font-medium text-neutral-800 dark:text-neutral-200">{svc.name}</span>
                                                {!svc.isActive ? (
                                                  <span className="ml-2 text-[10px] uppercase text-neutral-400">inactive</span>
                                                ) : null}
                                                {svc.head ? (
                                                  <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                                                    — Head: {svc.head.fullName}
                                                    {svc.head.contactPhone ? ` · ${svc.head.contactPhone}` : ''}
                                                  </span>
                                                ) : null}
                                                {svc.contactEmail ? (
                                                  <a href={`mailto:${svc.contactEmail}`} className={`ml-2 text-xs ${accentLink}`}>
                                                    {svc.contactEmail}
                                                  </a>
                                                ) : null}
                                                {svc.contactName || svc.contactPhone ? (
                                                  <p className="mt-0.5 text-xs text-neutral-500">
                                                    {[svc.contactName, svc.contactPhone].filter(Boolean).join(' · ')}
                                                  </p>
                                                ) : null}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    This panel shows your conference scope only. Leadership contacts for others appear as names without email or phone.
                    Member counts include linked member accounts (and admins tied to each congregation).
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {inConferenceLeaderShell ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 pt-4 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          <span className="font-medium text-neutral-500 dark:text-neutral-500">Other dashboards</span>
          {user && canAccessMemberPortal(user) ? (
            <Link href="/dashboard/member" className="font-medium text-indigo-700 hover:underline dark:text-indigo-400">
              Member portal
            </Link>
          ) : null}
          {user?.role === 'ADMIN' ? (
            <Link href="/dashboard/admin" className="font-medium text-indigo-700 hover:underline dark:text-indigo-400">
              Church admin
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          <Link href={legacyBackHref} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Back to dashboard
          </Link>
        </p>
      )}
    </div>
  );
}

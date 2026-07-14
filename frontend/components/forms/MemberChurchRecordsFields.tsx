'use client';

import type { CouncilBadge, PositionHeld } from '@/lib/api';

type CouncilOption = { _id: string; name: string };

type MemberChurchRecordsFieldsProps = {
  fieldClass: string;
  labelClass?: string;
  /** Councils the member belongs to (drives per-council badge rows). */
  councilOptions: CouncilOption[];
  councilIds: string[];
  isFullMember: boolean;
  onIsFullMemberChange: (v: boolean) => void;
  membershipDate: string;
  onMembershipDateChange: (v: string) => void;
  admittedBy: string;
  onAdmittedByChange: (v: string) => void;
  baptismDate: string;
  onBaptismDateChange: (v: string) => void;
  baptismBy: string;
  onBaptismByChange: (v: string) => void;
  baptismPlace: string;
  onBaptismPlaceChange: (v: string) => void;
  councilBadges: CouncilBadge[];
  onCouncilBadgesChange: (rows: CouncilBadge[]) => void;
  positionsHeld: PositionHeld[];
  onPositionsHeldChange: (rows: PositionHeld[]) => void;
};

function ensureBadgeRows(councilIds: string[], badges: CouncilBadge[]): CouncilBadge[] {
  const byId = new Map(badges.map((b) => [b.councilId, b]));
  return councilIds.map((id) => {
    const existing = byId.get(id);
    return (
      existing || {
        councilId: id,
        badgedVolunteerDate: '',
        badgedRuwadzanoDate: '',
      }
    );
  });
}

/**
 * Optional church life records: baptism, full membership, per-council badges, positions held.
 * Complements initial registration (these fields are deferred).
 */
export function MemberChurchRecordsFields({
  fieldClass,
  labelClass = 'mb-1 block text-xs font-medium text-neutral-600',
  councilOptions,
  councilIds,
  isFullMember,
  onIsFullMemberChange,
  membershipDate,
  onMembershipDateChange,
  admittedBy,
  onAdmittedByChange,
  baptismDate,
  onBaptismDateChange,
  baptismBy,
  onBaptismByChange,
  baptismPlace,
  onBaptismPlaceChange,
  councilBadges,
  onCouncilBadgesChange,
  positionsHeld,
  onPositionsHeldChange,
}: MemberChurchRecordsFieldsProps) {
  const nameById = new Map(councilOptions.map((c) => [c._id, c.name]));
  const badgeRows = ensureBadgeRows(councilIds, councilBadges);

  function updateBadge(councilId: string, patch: Partial<CouncilBadge>) {
    const next = ensureBadgeRows(councilIds, councilBadges).map((row) =>
      row.councilId === councilId ? { ...row, ...patch } : row
    );
    onCouncilBadgesChange(next);
  }

  function addPosition() {
    onPositionsHeldChange([
      ...positionsHeld,
      { title: '', organization: '', fromDate: '', toDate: '', notes: '' },
    ]);
  }

  function updatePosition(index: number, patch: Partial<PositionHeld>) {
    onPositionsHeldChange(positionsHeld.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removePosition(index: number) {
    onPositionsHeldChange(positionsHeld.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-neutral-900">Baptism</h3>
        <p className="mt-0.5 text-xs text-neutral-500">Optional — complete when known.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Baptized when</label>
            <input
              type="date"
              value={baptismDate}
              onChange={(e) => onBaptismDateChange(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Baptized by whom</label>
            <input
              value={baptismBy}
              onChange={(e) => onBaptismByChange(e.target.value)}
              className={fieldClass}
              placeholder="Minister / baptizing officer"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Baptized where</label>
            <input
              value={baptismPlace}
              onChange={(e) => onBaptismPlaceChange(e.target.value)}
              className={fieldClass}
              placeholder="Church, circuit, or place"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-900">Full membership</h3>
        <p className="mt-0.5 text-xs text-neutral-500">Optional — date and Mufundisi who admitted you.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="isFullMember"
              type="checkbox"
              checked={isFullMember}
              onChange={(e) => onIsFullMemberChange(e.target.checked)}
              className="size-4 rounded border-neutral-300"
            />
            <label htmlFor="isFullMember" className="text-sm text-neutral-800">
              Full member
            </label>
          </div>
          <div>
            <label className={labelClass}>Full membership date</label>
            <input
              type="date"
              value={membershipDate}
              onChange={(e) => {
                onMembershipDateChange(e.target.value);
                if (e.target.value) onIsFullMemberChange(true);
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Admitted by (Mufundisi)</label>
            <input
              value={admittedBy}
              onChange={(e) => onAdmittedByChange(e.target.value)}
              className={fieldClass}
              placeholder="Name of Mufundisi"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-900">Council badging</h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Per council — Badged Volunteer when, and Badged Ruwadzano when. Not required at registration.
        </p>
        {badgeRows.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No councils selected for this member.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {badgeRows.map((row) => (
              <div
                key={row.councilId}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {nameById.get(row.councilId) || row.councilName || 'Council'}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Badged Volunteer when</label>
                    <input
                      type="date"
                      value={row.badgedVolunteerDate || ''}
                      onChange={(e) => updateBadge(row.councilId, { badgedVolunteerDate: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Badged Ruwadzano when</label>
                    <input
                      type="date"
                      value={row.badgedRuwadzanoDate || ''}
                      onChange={(e) => updateBadge(row.councilId, { badgedRuwadzanoDate: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Positions held</h3>
            <p className="mt-0.5 text-xs text-neutral-500">Historical offices and roles (optional).</p>
          </div>
          <button
            type="button"
            onClick={addPosition}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Add position
          </button>
        </div>
        {positionsHeld.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No positions recorded yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {positionsHeld.map((row, index) => (
              <div key={row._id || index} className="rounded-lg border border-neutral-200 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Position / office</label>
                    <input
                      value={row.title}
                      onChange={(e) => updatePosition(index, { title: e.target.value })}
                      className={fieldClass}
                      placeholder="e.g. Secretary, Steward"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Body / council</label>
                    <input
                      value={row.organization || ''}
                      onChange={(e) => updatePosition(index, { organization: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>From</label>
                    <input
                      type="date"
                      value={row.fromDate || ''}
                      onChange={(e) => updatePosition(index, { fromDate: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>To (leave blank if current)</label>
                    <input
                      type="date"
                      value={row.toDate || ''}
                      onChange={(e) => updatePosition(index, { toDate: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <input
                      value={row.notes || ''}
                      onChange={(e) => updatePosition(index, { notes: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePosition(index)}
                  className="mt-2 text-xs font-medium text-red-700 hover:text-red-900"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

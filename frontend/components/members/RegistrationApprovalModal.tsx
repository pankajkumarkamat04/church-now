'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserCheck, X } from 'lucide-react';
import { ProvinceField } from '@/components/forms/ProvinceField';
import {
  apiFetch,
  type AuthUser,
  type Gender,
  type MemberAddress,
} from '@/lib/api';
import {
  approveBtn,
  fieldClass as sharedFieldClass,
  primaryBtn as sharedPrimaryBtn,
  secondaryBtn,
} from '@/lib/uiClasses';

const emptyAddress: MemberAddress = {
  line1: '',
  line2: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  country: '',
};

type Accent = 'sky' | 'violet';

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  memberId: string;
  /** Short label shown in the header (name/email from the list). */
  memberLabel?: string;
  accent?: Accent;
  /** admin | superadmin API surface */
  mode: 'admin' | 'superadmin';
  onCompleted: (action: 'saved' | 'approved') => void;
};

function splitName(full: string): { firstName: string; surname: string } {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: '', surname: '' };
  if (parts.length === 1) return { firstName: parts[0], surname: '' };
  return { firstName: parts[0], surname: parts.slice(1).join(' ') };
}

export function RegistrationApprovalModal({
  open,
  onClose,
  token,
  memberId,
  memberLabel,
  accent = 'sky',
  mode,
  onCompleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [memberBadgeType, setMemberBadgeType] = useState<'BADGED' | 'NON_BADGED'>('NON_BADGED');
  const [address, setAddress] = useState<MemberAddress>(emptyAddress);
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [churchId, setChurchId] = useState('');
  const [memberCategory, setMemberCategory] = useState('MEMBER');

  const f = sharedFieldClass(accent);
  const primary = sharedPrimaryBtn(accent);

  const load = useCallback(async () => {
    if (!token || !memberId) return;
    setLoading(true);
    setLoadErr(null);
    setErr(null);
    try {
      const profilePath =
        mode === 'admin'
          ? `/api/admin/members/${memberId}`
          : `/api/superadmin/users/${memberId}`;
      const councilsPath = mode === 'admin' ? '/api/admin/councils' : '/api/superadmin/councils';
      const [p, councilRows] = await Promise.all([
        apiFetch<AuthUser>(profilePath, { token }),
        apiFetch<Array<{ _id: string; name: string }>>(councilsPath, { token }),
      ]);

      const fromFull = splitName(p.fullName || '');
      setEmail(p.email || '');
      setFirstName(p.firstName || fromFull.firstName);
      setSurname(p.surname || fromFull.surname);
      setIdNumber(p.idNumber || '');
      setContactPhone(p.contactPhone || '');
      setGender(p.gender === 'MALE' || p.gender === 'FEMALE' ? p.gender : '');
      setDateOfBirth(p.dateOfBirth || p.date_of_birth || '');
      setMemberBadgeType(p.memberBadgeType === 'BADGED' ? 'BADGED' : 'NON_BADGED');
      setAddress(p.address ? { ...emptyAddress, ...p.address } : { ...emptyAddress });
      setCouncilIds(Array.isArray(p.councilIds) ? p.councilIds : []);
      setCouncils(councilRows);
      setMemberCategory(p.memberCategory || 'MEMBER');

      const confId =
        Array.isArray(p.conferences) && p.conferences.length > 0
          ? typeof p.conferences[0] === 'string'
            ? p.conferences[0]
            : (p.conferences[0] as { _id: string })._id
          : '';
      const cId =
        typeof p.church === 'object' && p.church && '_id' in p.church
          ? String((p.church as { _id: string })._id)
          : typeof p.church === 'string'
            ? p.church
            : '';
      setConferenceId(confId || '');
      setChurchId(cId || '');
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [token, memberId, mode]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  function validateClient(): string | null {
    if (!firstName.trim() && !surname.trim()) return 'Enter first name and surname';
    if (!contactPhone.trim()) return 'Contact phone is required';
    if (!idNumber.trim()) return 'National ID / passport is required';
    if (!dateOfBirth) return 'Date of birth is required';
    if (!gender) return 'Sex is required';
    if (!address.line1.trim()) return 'Address line 1 is required';
    if (!address.city.trim()) return 'City is required';
    if (!address.stateOrProvince.trim()) return 'Province / region is required';
    if (!address.country.trim()) return 'Country is required';
    if (councilIds.length === 0) return 'Select at least one council';
    return null;
  }

  async function saveProfile() {
    const fullName = `${firstName.trim()} ${surname.trim()}`.trim();
    if (mode === 'admin') {
      await apiFetch(`/api/admin/members/${memberId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          firstName: firstName.trim(),
          surname: surname.trim(),
          fullName,
          idNumber: idNumber.trim(),
          contactPhone: contactPhone.trim(),
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          address,
          councilIds,
          memberBadgeType,
          isActive: false,
        }),
      });
      return;
    }
    await apiFetch(`/api/superadmin/users/${memberId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({
        fullName,
        isActive: false,
        conferenceId: conferenceId || undefined,
        churchId: churchId || undefined,
        memberCategory,
        councilIds,
        memberBadgeType,
        firstName: firstName.trim(),
        surname: surname.trim(),
        idNumber: idNumber.trim(),
        contactPhone: contactPhone.trim(),
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        address,
      }),
    });
  }

  async function onSaveOnly() {
    setErr(null);
    const clientErr = validateClient();
    if (clientErr) {
      setErr(clientErr);
      return;
    }
    setBusy(true);
    try {
      await saveProfile();
      onCompleted('saved');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAndApprove() {
    setErr(null);
    const clientErr = validateClient();
    if (clientErr) {
      setErr(clientErr);
      return;
    }
    setBusy(true);
    try {
      await saveProfile();
      const approvePath =
        mode === 'admin'
          ? `/api/admin/members/${memberId}/approve`
          : `/api/superadmin/members/${memberId}/approve`;
      await apiFetch(approvePath, { method: 'PATCH', token });
      onCompleted('approved');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-900/50 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-approval-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <h3 id="registration-approval-title" className="text-lg font-semibold text-neutral-900">
              Complete registration
            </h3>
            <p className="mt-1 truncate text-sm text-neutral-600">
              {memberLabel || email || 'Pending member'}
              {email && memberLabel ? (
                <>
                  <span className="text-neutral-400"> · </span>
                  {email}
                </>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Fill required details, then approve to activate their login.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className={`size-8 animate-spin ${accent === 'violet' ? 'text-violet-600' : 'text-sky-600'}`}
              />
            </div>
          ) : loadErr ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadErr}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  First name <span className="text-red-600">*</span>
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={f}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Surname <span className="text-red-600">*</span>
                </label>
                <input
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className={f}
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  National ID / passport <span className="text-red-600">*</span>
                </label>
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={f} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Contact phone <span className="text-red-600">*</span>
                </label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={f}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Sex <span className="text-red-600">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender | '')}
                  className={f}
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Date of birth <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={f}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Badge category</label>
                <select
                  value={memberBadgeType}
                  onChange={(e) => setMemberBadgeType(e.target.value as 'BADGED' | 'NON_BADGED')}
                  className={f}
                >
                  <option value="NON_BADGED">Non-badged</option>
                  <option value="BADGED">Badged</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Councils <span className="text-red-600">*</span>
                </label>
                <select
                  multiple
                  value={councilIds}
                  onChange={(e) =>
                    setCouncilIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                  }
                  className={`${f} min-h-[100px]`}
                >
                  {councils.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">Hold Ctrl/Cmd to select multiple.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Address line 1 <span className="text-red-600">*</span>
                </label>
                <input
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className={f}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 2</label>
                <input
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className={f}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  City <span className="text-red-600">*</span>
                </label>
                <input
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className={f}
                />
              </div>
              <ProvinceField
                value={address.stateOrProvince}
                onChange={(stateOrProvince) => setAddress({ ...address, stateOrProvince })}
                className={f}
                labelClassName="mb-1 block text-xs font-medium text-neutral-600"
                label="Province / region *"
                required
              />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Country <span className="text-red-600">*</span>
                </label>
                <input
                  value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  className={f}
                />
              </div>
            </div>
          )}

          {err ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <button
            type="button"
            disabled={busy || loading || Boolean(loadErr)}
            onClick={() => void onSaveOnly()}
            className={`${primary} flex-1 sm:flex-none`}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save only
          </button>
          <button
            type="button"
            disabled={busy || loading || Boolean(loadErr)}
            onClick={() => void onSaveAndApprove()}
            className={`${approveBtn} flex-1 sm:flex-none`}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
            Save &amp; Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`${secondaryBtn} flex-1 sm:ml-auto sm:flex-none`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

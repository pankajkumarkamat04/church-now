'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  displayChurchName,
  displayCurrentRole,
  displayPastorName,
  formatDateOnly,
  memberAddressString,
} from '@/lib/pastorRecordDisplay';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type ChurchOption = { _id: string; name: string; churchType?: 'MAIN' | 'SUB' };
type MemberAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
};
type MemberOption = {
  _id: string;
  fullName?: string;
  email?: string;
  memberId?: string;
  contactPhone?: string;
  address?: MemberAddress;
  dateOfBirth?: string;
  gender?: string;
};
type PastorRecordRow = {
  _id: string;
  currentRole?: string;
  church?: { _id?: string; name?: string } | string;
  member?: { _id?: string; fullName?: string; email?: string; memberId?: string };
  personal?: {
    name?: string;
    fullName?: string;
    title?: string;
    contactEmail?: string;
    email?: string;
    contactPhone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    addressText?: string;
  };
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
};

export default function SuperadminPastorsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [rows, setRows] = useState<PastorRecordRow[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [recordMemberId, setRecordMemberId] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [denomination, setDenomination] = useState('');
  const [ordinationDate, setOrdinationDate] = useState('');
  const [qualificationsText, setQualificationsText] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!token || user?.role !== 'SUPERADMIN') return;
      const [churchRows, pastorRows] = await Promise.all([
        apiFetch<ChurchOption[]>('/api/superadmin/churches', { token }),
        apiFetch<PastorRecordRow[]>('/api/superadmin/pastors', { token }),
      ]);
      setChurches(churchRows);
      setRows(pastorRows);
    }
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load records'));
  }, [token, user]);

  useEffect(() => {
    async function loadMembersForChurch() {
      if (!token || !selectedChurchId) {
        setMemberOptions([]);
        setRecordMemberId('');
        return;
      }
      const members = await apiFetch<MemberOption[]>(
        `/api/superadmin/pastor-members?churchId=${encodeURIComponent(selectedChurchId)}`,
        { token }
      );
      setMemberOptions(members);
      setRecordMemberId('');
    }
    loadMembersForChurch().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load members'));
  }, [selectedChurchId, token]);

  useEffect(() => {
    if (!recordMemberId) {
      setName('');
      setTitle('');
      setContactEmail('');
      setContactPhone('');
      setDateOfBirth('');
      setGender('');
      setAddress('');
      return;
    }
    const m = memberOptions.find((x) => x._id === recordMemberId);
    if (!m) return;
    setName(m.fullName || '');
    setContactEmail(m.email || '');
    setContactPhone(m.contactPhone || '');
    if (m.dateOfBirth) {
      const t = new Date(m.dateOfBirth);
      if (!Number.isNaN(t.getTime())) setDateOfBirth(t.toISOString().slice(0, 10));
      else setDateOfBirth('');
    } else setDateOfBirth('');
    setGender(m.gender || '');
    setAddress(memberAddressString(m.address) || '');
  }, [recordMemberId, memberOptions]);

  async function createRecord() {
    if (!token || !selectedChurchId || !recordMemberId) {
      setErr('Select church and member');
      return;
    }
    setSavingRecord(true);
    setErr(null);
    try {
      await apiFetch('/api/superadmin/pastors', {
        method: 'POST',
        token,
        body: JSON.stringify({
          churchId: selectedChurchId,
          memberId: recordMemberId,
          name: name || undefined,
          title: title || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          dateOfBirth: dateOfBirth || null,
          gender: gender || undefined,
          address: address || undefined,
          currentRole: currentRole || undefined,
          credentials: {
            ordinationDate: ordinationDate || null,
            denomination,
            qualifications: qualificationsText.split(',').map((x) => x.trim()).filter(Boolean),
          },
        }),
      });
      const pastorRows = await apiFetch<PastorRecordRow[]>('/api/superadmin/pastors', { token });
      setRows(pastorRows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create record');
    } finally {
      setSavingRecord(false);
    }
  }

  const selectedChurchName = churches.find((c) => c._id === selectedChurchId)?.name || '';
  const filteredByChurch = useMemo(() => {
    if (!selectedChurchId) return rows;
    return rows.filter((r) => (typeof r.church === 'object' && r.church ? r.church._id === selectedChurchId : false));
  }, [rows, selectedChurchId]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Record keeping</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Reverends/Pastors records
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Create and manage record-keeping across all churches.</p>
        </div>
        <div className="w-full sm:w-80 space-y-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600">Select church</label>
          <select value={selectedChurchId} onChange={(e) => setSelectedChurchId(e.target.value)} className={field}>
            <option value="">Select church</option>
            {churches.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-neutral-900">
          Add record {selectedChurchName ? `for ${selectedChurchName}` : ''}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Reverend / Member / Admin</label>
            <select value={recordMemberId} onChange={(e) => setRecordMemberId(e.target.value)} className={field} disabled={!selectedChurchId}>
              <option value="">{selectedChurchId ? 'Select reverend/member/admin' : 'Select church first'}</option>
              {memberOptions.map((m) => (
                <option key={m._id} value={m._id}>
                  {(m.fullName || m.email || 'Member') + (m.memberId ? ` (${m.memberId})` : '')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (Reverend, Pastor, Dr., …)" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact Email</label>
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="Contact email" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact Phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Date of Birth</label>
            <input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} type="date" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Gender</label>
            <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Gender" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Ordination Date</label>
            <input value={ordinationDate} onChange={(e) => setOrdinationDate(e.target.value)} type="date" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Denomination</label>
            <input value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="Denomination" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Qualifications</label>
            <input value={qualificationsText} onChange={(e) => setQualificationsText(e.target.value)} placeholder="Qualifications (comma separated)" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Current Role</label>
            <input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="Current role" className={field} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createRecord()}
          disabled={savingRecord || !selectedChurchId}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {savingRecord ? 'Saving…' : 'Add record'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1400px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-3 py-3 font-medium">Church assigned to</th>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Title</th>
              <th className="px-3 py-3 font-medium">Contact email</th>
              <th className="px-3 py-3 font-medium">Contact phone</th>
              <th className="px-3 py-3 font-medium">DOB</th>
              <th className="px-3 py-3 font-medium">Gender</th>
              <th className="px-3 py-3 font-medium">Address</th>
              <th className="px-3 py-3 font-medium">Ordination</th>
              <th className="px-3 py-3 font-medium">Denomination</th>
              <th className="px-3 py-3 font-medium">Qualifications</th>
              <th className="px-3 py-3 font-medium">Current role</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {filteredByChurch.map((r) => (
              <tr key={r._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-3 max-w-[12rem] truncate" title={displayChurchName(r)}>
                  {displayChurchName(r)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{displayPastorName(r)}</td>
                <td className="px-3 py-3 max-w-[8rem] truncate" title={r.personal?.title || ''}>
                  {r.personal?.title || '—'}
                </td>
                <td className="px-3 py-3 max-w-[10rem] truncate" title={r.personal?.contactEmail || r.personal?.email || ''}>
                  {r.personal?.contactEmail || r.personal?.email || '—'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{r.personal?.contactPhone || '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(r.personal?.dateOfBirth)}</td>
                <td className="px-3 py-3">{r.personal?.gender || '—'}</td>
                <td className="px-3 py-3 max-w-[14rem] text-xs" title={r.personal?.address || r.personal?.addressText || ''}>
                  {r.personal?.address || r.personal?.addressText || '—'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(r.credentials?.ordinationDate)}</td>
                <td className="px-3 py-3 max-w-[8rem] truncate" title={r.credentials?.denomination || ''}>
                  {r.credentials?.denomination || '—'}
                </td>
                <td className="px-3 py-3 max-w-[12rem] text-xs" title={(r.credentials?.qualifications || []).join(', ')}>
                  {(r.credentials?.qualifications || []).length ? (r.credentials?.qualifications || []).join(', ') : '—'}
                </td>
                <td className="px-3 py-3 max-w-[10rem] truncate" title={displayCurrentRole(r)}>
                  {displayCurrentRole(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredByChurch.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No records found.</p> : null}
      </div>
    </div>
  );
}

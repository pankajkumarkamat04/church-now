'use client';

import { useEffect, useState } from 'react';
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
  member?: { fullName?: string; email?: string; memberId?: string };
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
  assignmentHistory?: Array<{ roleTitle?: string; churchName?: string; startDate?: string; endDate?: string; notes?: string }>;
  contactSchedule?: { availability?: string; officeHours?: string; emergencyContactName?: string; emergencyContactPhone?: string };
  trainings?: Array<{ title?: string; provider?: string; date?: string; certificateRef?: string; notes?: string }>;
  confidentialNotes?: string;
  isActive?: boolean;
};

export default function AdminPastorsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<PastorRecordRow[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
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
  const [currentRoleChurch, setCurrentRoleChurch] = useState('');
  const [currentRoleStartDate, setCurrentRoleStartDate] = useState('');
  const [currentRoleEndDate, setCurrentRoleEndDate] = useState('');
  const [currentRoleNotes, setCurrentRoleNotes] = useState('');
  const [availability, setAvailability] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [trainingTitle, setTrainingTitle] = useState('');
  const [trainingProvider, setTrainingProvider] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [trainingCertificateRef, setTrainingCertificateRef] = useState('');
  const [trainingNotes, setTrainingNotes] = useState('');
  const [confidentialNotes, setConfidentialNotes] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    async function loadPage() {
      if (!token || user?.role !== 'ADMIN') return;
      const [pastorRows, members] = await Promise.all([
        apiFetch<PastorRecordRow[]>('/api/admin/pastors', { token }),
        apiFetch<MemberOption[]>('/api/admin/pastor-members', { token }),
      ]);
      setRecords(pastorRows);
      setMemberOptions(members);
    }
    loadPage().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load record-keeping module'));
  }, [token, user]);

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

  async function createPastorRecord() {
    if (!token || !recordMemberId) {
      setErr('Select a member to create record');
      return;
    }
    setSavingRecord(true);
    setErr(null);
    try {
      await apiFetch('/api/admin/pastors', {
        method: 'POST',
        token,
        body: JSON.stringify({
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
            qualifications: qualificationsText
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          },
          assignmentHistory: currentRole
            ? [
                {
                  roleTitle: currentRole,
                  churchName: currentRoleChurch,
                  startDate: currentRoleStartDate || null,
                  endDate: currentRoleEndDate || null,
                  notes: currentRoleNotes,
                },
              ]
            : [],
          contactSchedule: {
            availability,
            officeHours,
            emergencyContactName,
            emergencyContactPhone,
          },
          trainings: trainingTitle
            ? [
                {
                  title: trainingTitle,
                  provider: trainingProvider,
                  date: trainingDate || null,
                  certificateRef: trainingCertificateRef,
                  notes: trainingNotes,
                },
              ]
            : [],
          confidentialNotes,
        }),
      });
      const pastorRows = await apiFetch<PastorRecordRow[]>('/api/admin/pastors', { token });
      setRecords(pastorRows);
      setRecordMemberId('');
      setName('');
      setTitle('');
      setContactEmail('');
      setContactPhone('');
      setDateOfBirth('');
      setGender('');
      setAddress('');
      setDenomination('');
      setOrdinationDate('');
      setQualificationsText('');
      setCurrentRole('');
      setCurrentRoleChurch('');
      setCurrentRoleStartDate('');
      setCurrentRoleEndDate('');
      setCurrentRoleNotes('');
      setAvailability('');
      setOfficeHours('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setTrainingTitle('');
      setTrainingProvider('');
      setTrainingDate('');
      setTrainingCertificateRef('');
      setTrainingNotes('');
      setConfidentialNotes('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create record');
    } finally {
      setSavingRecord(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Record keeping (Reverends/Pastors)</h1>
        <p className="mt-1 text-sm text-neutral-600">Capture personal details, credentials, assignments, contact schedule, trainings, and confidential notes.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select value={recordMemberId} onChange={(e) => setRecordMemberId(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
            <option value="">Select reverend/member/admin</option>
            {memberOptions.map((m) => (
              <option key={m._id} value={m._id}>
                {(m.fullName || m.email || 'Member') + (m.memberId ? ` (${m.memberId})` : '')}
              </option>
            ))}
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (Reverend, Pastor, Dr., …)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="Contact email" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" title="Date of birth" />
          <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Gender" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={ordinationDate} onChange={(e) => setOrdinationDate(e.target.value)} type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" title="Ordination date" />
          <input value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="Denomination" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={qualificationsText} onChange={(e) => setQualificationsText(e.target.value)} placeholder="Qualifications (comma separated)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="Current role" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={currentRoleChurch} onChange={(e) => setCurrentRoleChurch(e.target.value)} placeholder="Current/previous church name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={currentRoleStartDate} onChange={(e) => setCurrentRoleStartDate(e.target.value)} type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={currentRoleEndDate} onChange={(e) => setCurrentRoleEndDate(e.target.value)} type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Availability" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={officeHours} onChange={(e) => setOfficeHours(e.target.value)} placeholder="Office hours" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Emergency contact name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="Emergency contact phone" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={trainingTitle} onChange={(e) => setTrainingTitle(e.target.value)} placeholder="Training/workshop title" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={trainingProvider} onChange={(e) => setTrainingProvider(e.target.value)} placeholder="Training provider" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input value={trainingCertificateRef} onChange={(e) => setTrainingCertificateRef(e.target.value)} placeholder="Certificate ref" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <textarea value={currentRoleNotes} onChange={(e) => setCurrentRoleNotes(e.target.value)} placeholder="Assignment notes" className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" rows={2} />
        <textarea value={trainingNotes} onChange={(e) => setTrainingNotes(e.target.value)} placeholder="Training notes" className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" rows={2} />
        <textarea value={confidentialNotes} onChange={(e) => setConfidentialNotes(e.target.value)} placeholder="Confidential notes" className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" rows={3} />
        <button
          type="button"
          onClick={() => void createPastorRecord()}
          disabled={savingRecord}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {savingRecord ? 'Saving…' : 'Add record'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">Records</div>
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
            {records.map((r) => (
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
        {records.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No records yet.</p> : null}
      </div>

    </div>
  );
}

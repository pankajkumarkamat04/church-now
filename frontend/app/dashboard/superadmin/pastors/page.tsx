'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';

type ChurchOption = { _id: string; name: string; churchType?: 'MAIN' | 'SUB' };
type MemberOption = { _id: string; fullName?: string; email?: string; memberId?: string };
type PastorRecordRow = {
  _id: string;
  church?: { _id?: string; name?: string } | string;
  member?: { _id?: string; fullName?: string; email?: string; memberId?: string };
  personal?: { fullName?: string; email?: string; contactPhone?: string; addressText?: string };
  credentials?: { ordinationDate?: string; denomination?: string; qualifications?: string[] };
  assignmentHistory?: Array<{ roleTitle?: string; churchName?: string; startDate?: string; endDate?: string; notes?: string }>;
  contactSchedule?: { availability?: string; officeHours?: string; emergencyContactName?: string; emergencyContactPhone?: string };
  trainings?: Array<{ title?: string; provider?: string; date?: string; certificateRef?: string; notes?: string }>;
  confidentialNotes?: string;
};

export default function SuperadminPastorsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [rows, setRows] = useState<PastorRecordRow[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [recordMemberId, setRecordMemberId] = useState('');
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
          credentials: {
            ordinationDate: ordinationDate || null,
            denomination,
            qualifications: qualificationsText.split(',').map((x) => x.trim()).filter(Boolean),
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
          contactSchedule: { availability, officeHours, emergencyContactName, emergencyContactPhone },
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
    <div className="max-w-6xl">
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
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={recordMemberId} onChange={(e) => setRecordMemberId(e.target.value)} className={field} disabled={!selectedChurchId}>
            <option value="">{selectedChurchId ? 'Select reverend/pastor member' : 'Select church first'}</option>
            {memberOptions.map((m) => (
              <option key={m._id} value={m._id}>
                {(m.fullName || m.email || 'Member') + (m.memberId ? ` (${m.memberId})` : '')}
              </option>
            ))}
          </select>
          <input value={ordinationDate} onChange={(e) => setOrdinationDate(e.target.value)} type="date" className={field} />
          <input value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="Denomination" className={field} />
          <input value={qualificationsText} onChange={(e) => setQualificationsText(e.target.value)} placeholder="Qualifications (comma separated)" className={field} />
          <input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="Current role title" className={field} />
          <input value={currentRoleChurch} onChange={(e) => setCurrentRoleChurch(e.target.value)} placeholder="Current/previous church name" className={field} />
          <input value={currentRoleStartDate} onChange={(e) => setCurrentRoleStartDate(e.target.value)} type="date" className={field} />
          <input value={currentRoleEndDate} onChange={(e) => setCurrentRoleEndDate(e.target.value)} type="date" className={field} />
          <input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Availability" className={field} />
          <input value={officeHours} onChange={(e) => setOfficeHours(e.target.value)} placeholder="Office hours" className={field} />
          <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Emergency contact name" className={field} />
          <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="Emergency contact phone" className={field} />
          <input value={trainingTitle} onChange={(e) => setTrainingTitle(e.target.value)} placeholder="Training/workshop title" className={field} />
          <input value={trainingProvider} onChange={(e) => setTrainingProvider(e.target.value)} placeholder="Training provider" className={field} />
          <input value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} type="date" className={field} />
          <input value={trainingCertificateRef} onChange={(e) => setTrainingCertificateRef(e.target.value)} placeholder="Certificate ref" className={field} />
        </div>
        <textarea value={currentRoleNotes} onChange={(e) => setCurrentRoleNotes(e.target.value)} placeholder="Assignment notes" className={`mt-3 w-full ${field}`} rows={2} />
        <textarea value={trainingNotes} onChange={(e) => setTrainingNotes(e.target.value)} placeholder="Training notes" className={`mt-3 w-full ${field}`} rows={2} />
        <textarea value={confidentialNotes} onChange={(e) => setConfidentialNotes(e.target.value)} placeholder="Confidential notes" className={`mt-3 w-full ${field}`} rows={3} />
        <button
          type="button"
          onClick={() => void createRecord()}
          disabled={savingRecord || !selectedChurchId}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {savingRecord ? 'Saving…' : 'Add record'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <th className="px-4 py-3 font-medium">Church</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Denomination</th>
              <th className="px-4 py-3 font-medium">Ordination</th>
              <th className="px-4 py-3 font-medium">Current Role</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {filteredByChurch.map((r) => (
              <tr key={r._id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">{typeof r.church === 'object' && r.church ? r.church.name || '—' : '—'}</td>
                <td className="px-4 py-3">{r.personal?.fullName || r.member?.fullName || '—'}</td>
                <td className="px-4 py-3">{r.personal?.contactPhone || r.personal?.email || '—'}</td>
                <td className="px-4 py-3">{r.credentials?.denomination || '—'}</td>
                <td className="px-4 py-3">{r.credentials?.ordinationDate ? new Date(r.credentials.ordinationDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">{r.assignmentHistory?.[0]?.roleTitle || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredByChurch.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No records found.</p> : null}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type DaySummary = { dateKey: string; presentCount: number; totalCount: number };
type DayMember = {
  memberId: string;
  memberCode: string;
  name: string;
  isActive: boolean;
  status: 'PRESENT' | 'ABSENT';
  note: string;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dateKeyFromParts(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AdminAttendancePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [monthRows, setMonthRows] = useState<DaySummary[]>([]);
  const [dayMembers, setDayMembers] = useState<DayMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const month = monthKey(viewDate);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') return;
    apiFetch<DaySummary[]>(`/api/admin/attendance?month=${encodeURIComponent(month)}`, { token })
      .then(setMonthRows)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load attendance month'));
  }, [token, user, month]);

  useEffect(() => {
    if (!token || !selectedDateKey) return;
    apiFetch<{ members: DayMember[] }>(`/api/admin/attendance/${selectedDateKey}`, { token })
      .then((r) => setDayMembers(r.members))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load day'));
  }, [token, selectedDateKey]);

  const monthMap = useMemo(() => new Map(monthRows.map((r) => [r.dateKey, r])), [monthRows]);
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstWeekday = new Date(y, m, 1).getDay();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, i) => {
    if (i < firstWeekday) return null;
    const day = i - firstWeekday + 1;
    const dk = dateKeyFromParts(y, m, day);
    return { day, dateKey: dk, summary: monthMap.get(dk) };
  });

  async function saveDay() {
    if (!token || !selectedDateKey || dayMembers.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/admin/attendance/${selectedDateKey}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          entries: dayMembers.map((m) => ({ memberId: m.memberId, status: m.status, note: m.note })),
        }),
      });
      const updated = await apiFetch<DaySummary[]>(`/api/admin/attendance?month=${encodeURIComponent(month)}`, { token });
      setMonthRows(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save attendance');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Attendance</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900 sm:text-3xl">Calendar attendance</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setViewDate(new Date(y, m - 1, 1))} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm">Prev</button>
          <p className="min-w-[120px] text-center text-sm font-medium text-neutral-800">{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</p>
          <button type="button" onClick={() => setViewDate(new Date(y, m + 1, 1))} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm">Next</button>
        </div>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1.3fr]">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, idx) =>
              c ? (
                <button
                  key={c.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(c.dateKey)}
                  className={`min-h-[72px] rounded-lg border p-1 text-left ${
                    selectedDateKey === c.dateKey ? 'border-sky-500 bg-sky-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <p className="text-xs font-semibold text-neutral-800">{c.day}</p>
                  <p className="mt-1 text-[10px] text-neutral-600">
                    {c.summary ? `${c.summary.presentCount}/${c.summary.totalCount} present` : 'No record'}
                  </p>
                </button>
              ) : (
                <div key={`blank-${idx}`} />
              )
            )}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              {selectedDateKey ? `Attendance for ${selectedDateKey}` : 'Select a date'}
            </h2>
            <button
              type="button"
              onClick={() => void saveDay()}
              disabled={busy || !selectedDateKey || dayMembers.length === 0}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save day'}
            </button>
          </div>
          {selectedDateKey ? (
            <div className="max-h-[540px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-600">
                    <th className="py-2 pr-2 font-medium">Member</th>
                    <th className="py-2 pr-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {dayMembers.map((m) => (
                    <tr key={m.memberId} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-neutral-900">{m.name}</p>
                        <p className="text-xs text-neutral-500">{m.memberCode || '—'}</p>
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={m.status}
                          onChange={(e) =>
                            setDayMembers((prev) =>
                              prev.map((x) => (x.memberId === m.memberId ? { ...x, status: e.target.value as 'PRESENT' | 'ABSENT' } : x))
                            )
                          }
                          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <input
                          value={m.note}
                          onChange={(e) =>
                            setDayMembers((prev) => prev.map((x) => (x.memberId === m.memberId ? { ...x, note: e.target.value } : x)))
                          }
                          placeholder="Optional note"
                          className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Pick a day on the calendar to manage attendance.</p>
          )}
        </div>
      </div>
    </div>
  );
}

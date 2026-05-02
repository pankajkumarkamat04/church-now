'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';


const field =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20';

export default function AdminMemberCreatePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [membershipDate, setMembershipDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY'>('MALE');
  const [contactPhone, setContactPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [councils, setCouncils] = useState<Array<{ _id: string; name: string }>>([]);
  const [councilIds, setCouncilIds] = useState<string[]>([]);
  const [memberBadgeType, setMemberBadgeType] = useState<'BADGED' | 'NON_BADGED'>('NON_BADGED');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleCouncil(id: string) {
    setCouncilIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);



  useEffect(() => {
    async function loadGlobalCouncils() {
      if (!token || user?.role !== 'ADMIN') return;
      try {
        const rows = await apiFetch<Array<{ _id: string; name: string }>>('/api/admin/councils', {
          token,
        });
        setCouncils(rows);
        setCouncilIds((prev) => (prev.length > 0 ? prev : rows[0]?._id ? [rows[0]._id] : []));
      } catch {
        setCouncils([]);
      }
    }
    loadGlobalCouncils();
  }, [token, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (councilIds.length === 0) {
      setErr('Select at least one council');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiFetch('/api/admin/members', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          firstName,
          surname,
          idNumber,

          councilIds,
          dateOfBirth,
          gender,
          contactPhone,
          address: { line1, line2, city, stateOrProvince, postalCode, country },
          membershipDate: membershipDate || undefined,
          baptismDate: baptismDate || undefined,
          memberBadgeType,
        }),
      });
      router.replace('/dashboard/admin/members');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <Link
        href="/dashboard/admin/members"
        className="text-sm font-medium text-sky-700 hover:text-sky-900"
      >
        ← Back to members
      </Link>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Add member</h1>
        <p className="mt-1 text-sm text-neutral-600">
          New members are saved to your church via the API and can sign in immediately.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
            </div>
            <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Password</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">First name</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Surname</label>
              <input required value={surname} onChange={(e) => setSurname(e.target.value)} className={field} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Councils</label>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {councils.map((c) => {
                    const selected = councilIds.includes(c._id);
                    return (
                      <label
                        key={c._id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          selected
                            ? 'border-sky-300 bg-sky-50 text-sky-900'
                            : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCouncil(c._id)}
                          className="size-4 rounded border-neutral-300"
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
                {councils.length === 0 ? (
                  <p className="text-xs text-neutral-500">No global councils available yet.</p>
                ) : (
                  <p className="mt-2 text-xs text-neutral-500">Select one or more councils (global list).</p>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">ID</label>
              <input required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Date of birth</label>
              <input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Membership date</label>
              <input
                type="date"
                value={membershipDate}
                onChange={(e) => setMembershipDate(e.target.value)}
                className={field}
                title="Leave empty to use today’s date"
              />
              <p className="mt-0.5 text-xs text-neutral-500">Optional — defaults to today if left blank</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Baptism date</label>
              <input type="date" value={baptismDate} onChange={(e) => setBaptismDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY')} className={field}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_SAY">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Badge category</label>
              <select
                value={memberBadgeType}
                onChange={(e) => setMemberBadgeType(e.target.value as 'BADGED' | 'NON_BADGED')}
                className={field}
              >
                <option value="NON_BADGED">Non-badged</option>
                <option value="BADGED">Badged</option>
              </select>
              <p className="mt-0.5 text-xs text-neutral-500">Stored on the member record for congregation reporting.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Contact phone</label>
              <input required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 1</label>
              <input required value={line1} onChange={(e) => setLine1(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Address line 2</label>
              <input value={line2} onChange={(e) => setLine2(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">City</label>
              <input required value={city} onChange={(e) => setCity(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">State / Province</label>
              <input required value={stateOrProvince} onChange={(e) => setStateOrProvince(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Postal code</label>
              <input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Country</label>
              <input required value={country} onChange={(e) => setCountry(e.target.value)} className={field} />
            </div>
          </div>
          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create member
            </button>
            <Link
              href="/dashboard/admin/members"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

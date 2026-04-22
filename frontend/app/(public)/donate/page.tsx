'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiFetch } from '@/lib/api';

type ChurchOption = { _id: string; name: string };

export default function PublicDonatePage() {
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [churchId, setChurchId] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ChurchOption[]>('/api/public/churches')
      .then((rows) => {
        setChurches(rows);
        setChurchId(rows[0]?._id || '');
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load churches'));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setBusy(true);
    try {
      await apiFetch('/api/public/donations', {
        method: 'POST',
        body: JSON.stringify({
          churchId,
          donorName,
          donorEmail,
          donorPhone,
          amount: Number(amount),
          currency,
          note,
        }),
      });
      setAmount('');
      setNote('');
      setSuccess('Thank you for your donation.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to submit donation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-center text-xl font-semibold text-neutral-900">Make a donation</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">You can donate even without logging in.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Church</label>
          <select value={churchId} onChange={(e) => setChurchId(e.target.value)} required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900">
            <option value="">Select church</option>
            {churches.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Your name</label>
          <input value={donorName} onChange={(e) => setDonorName(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
          <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Phone</label>
          <input value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Amount</label>
          <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
        </div>
        {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{err}</p> : null}
        {success ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">{success}</p> : null}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit donation
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-neutral-700 hover:text-neutral-900">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}

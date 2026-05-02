'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type MemberRow = {
  id: string;
  email: string;
  fullName?: string;
  memberId?: string;
  memberCategory?: string;
  memberRoleDisplay?: string;
  role?: string;
  isActive?: boolean;
};

type Church = { _id: string; name: string };

export default function SuperadminChurchMembersPage() {
  const params = useParams();
  const churchId = params.churchId as string;
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [church, setChurch] = useState<Church | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !churchId) return;
    setErr(null);
    const [churchRow, memberRows] = await Promise.all([
      apiFetch<Church>(`/api/superadmin/churches/${churchId}`, { token }),
      apiFetch<MemberRow[]>(`/api/superadmin/users?role=ALL&churchId=${encodeURIComponent(churchId)}`, { token }),
    ]);
    setChurch(churchRow);
    setMembers(memberRows);
  }, [token, churchId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token && churchId) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load members'));
    }
  }, [user, token, churchId, load]);

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard/superadmin/churches" className="text-sm font-medium text-violet-700 hover:text-violet-900">
          ← Back to churches
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Church members &amp; admins</h1>
        <p className="mt-1 text-sm text-neutral-600">{church?.name || 'Loading church...'}</p>
      </div>
      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!church ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-7 animate-spin text-violet-600" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Member ID</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Member role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700">{member.memberId || '—'}</td>
                    <td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">{member.fullName || '—'}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {member.role === 'ADMIN' ? 'Church admin' : 'Member'}
                    </td>
                    <td className="px-4 py-3">
                      {member.memberRoleDisplay || member.memberCategory || (member.role === 'ADMIN' ? '—' : 'MEMBER')}
                    </td>
                    <td className="px-4 py-3">{member.isActive === false ? 'Inactive' : 'Active'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/superadmin/users/${member.id}/edit`}
                        className="text-xs font-medium text-violet-700 hover:text-violet-900 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">No members in this church.</p> : null}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminChurches } from '@/app/dashboard/superadmin/useSuperadminChurches';

type ChurchContentHubProps = {
  title: string;
  moduleLabel: string;
  description: string;
  actionLabel: string;
  /** e.g. `/dashboard/superadmin/events` — link becomes `${manageBasePath}/${churchId}` */
  manageBasePath: string;
};

export function ChurchContentHub({
  title,
  moduleLabel,
  description,
  actionLabel,
  manageBasePath,
}: ChurchContentHubProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { churches, err } = useSuperadminChurches();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  const base = manageBasePath.replace(/\/$/, '');

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{moduleLabel}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Church</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {churches.map((c) => (
                <tr key={c._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`${base}/${c._id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100"
                    >
                      {actionLabel}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        {churches.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No churches yet.</p>
        ) : null}
      </div>
    </div>
  );
}

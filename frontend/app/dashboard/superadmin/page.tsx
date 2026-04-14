'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CreditCard, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperadminData } from './useSuperadminData';

export default function SuperadminOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { churches, users, err } = useSuperadminData();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  const modules = [
    {
      href: '/dashboard/superadmin/churches',
      title: 'Church management',
      description: 'Create churches, view public slugs, and manage organization records.',
      icon: Building2,
      count: churches.length,
      countLabel: 'churches',
    },
    {
      href: '/dashboard/superadmin/users',
      title: 'User management',
      description: 'View every account, assign church admins, and onboard leaders.',
      icon: Users,
      count: users.length,
      countLabel: 'users',
    },
    {
      href: '/dashboard/superadmin/subscriptions',
      title: 'Subscriptions',
      description: 'Monitor plans and member subscriptions across all churches.',
      icon: CreditCard,
      count: 0,
      countLabel: 'module',
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Choose a module to manage churches or users across the platform.
        </p>
      </div>

      {err ? (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
                <m.icon className="size-5" aria-hidden />
              </span>
              <ArrowRight className="size-5 shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">{m.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{m.description}</p>
            <p className="mt-4 text-sm font-medium text-violet-700">
              {m.count} {m.countLabel}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

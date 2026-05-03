'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Calendar,
  Shield,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
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

  const totalUsers = users.length;
  const totalChurches = churches.length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const totalMembers = users.filter((u) => u.role === 'MEMBER').length;
  const totalSuperadmins = users.filter((u) => u.role === 'SUPERADMIN').length;
  const activeUsers = users.filter((u) => u.isActive !== false).length;
  const inactiveUsers = totalUsers - activeUsers;
  const totalCouncils = churches.reduce((sum, c) => sum + (Array.isArray(c.councils) ? c.councils.length : 0), 0);

  const statCards = [
    {
      title: 'Total churches',
      value: totalChurches,
      subtitle: 'Main and sub churches',
      icon: Building2,
      tint: 'bg-violet-100 text-violet-800',
    },
    {
      title: 'Total users',
      value: totalUsers,
      subtitle: `${activeUsers} active, ${inactiveUsers} inactive`,
      icon: Users,
      tint: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Admins',
      value: totalAdmins + totalSuperadmins,
      subtitle: `${totalAdmins} church admins, ${totalSuperadmins} superadmins`,
      icon: Shield,
      tint: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Members',
      value: totalMembers,
      subtitle: 'Member accounts in system',
      icon: UserCog,
      tint: 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Councils',
      value: totalCouncils,
      subtitle: 'Councils across churches',
      icon: Calendar,
      tint: 'bg-fuchsia-100 text-fuchsia-800',
    },
  ];

  const quickLinks = [
    {
      href: '/dashboard/superadmin/churches',
      title: 'Manage churches',
      description: 'Create, edit, and organize main/sub churches.',
      icon: Building2,
    },
    {
      href: '/dashboard/superadmin/users',
      title: 'Manage members',
      description: 'Add members and filter by conference/church.',
      icon: Users,
    },
    {
      href: '/dashboard/superadmin/admins',
      title: 'Manage admins',
      description: 'Handle church admins and superadmin accounts.',
      icon: Shield,
    },
    {
      href: '/dashboard/superadmin/conferences',
      title: 'Manage conferences',
      description: 'Create conferences and view linked churches.',
      icon: Calendar,
    },
    {
      href: '/dashboard/superadmin/finance',
      title: 'Finance',
      description: 'Tithes, subscriptions, donations, expenses, and reports.',
      icon: Wallet,
    },
  ];

  return (
    <div className="w-full min-w-0 max-w-7xl">
      <div className="mb-8 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Superadmin dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Control center
        </h1>
      </div>

      {err ? (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.title} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-600">{card.title}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{card.value}</p>
                <p className="mt-1 text-xs text-neutral-500">{card.subtitle}</p>
              </div>
              <span className={`inline-flex rounded-lg p-2 ${card.tint}`}>
                <card.icon className="size-4" aria-hidden />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Quick links</h2>
            <span className="text-xs text-neutral-500">Daily actions</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="group rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex rounded-md bg-violet-100 p-2 text-violet-800">
                    <m.icon className="size-4" aria-hidden />
                  </span>
                  <ArrowRight className="size-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
                </div>
                <p className="mt-3 text-sm font-semibold text-neutral-900">{m.title}</p>
                <p className="mt-1 text-xs text-neutral-600">{m.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">User role breakdown</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
              <p className="text-sm text-neutral-700">Members</p>
              <p className="text-sm font-semibold text-neutral-900">{totalMembers}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
              <p className="text-sm text-neutral-700">Church admins</p>
              <p className="text-sm font-semibold text-neutral-900">{totalAdmins}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
              <p className="text-sm text-neutral-700">Superadmins</p>
              <p className="text-sm font-semibold text-neutral-900">{totalSuperadmins}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
              <p className="text-sm text-neutral-700">Inactive users</p>
              <p className="text-sm font-semibold text-neutral-900">{inactiveUsers}</p>
            </div>
          </div>
          <Link
            href="/dashboard/superadmin/users"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            Open members
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-900">Next actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/superadmin/users/members/create" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            Add member
          </Link>
          <Link href="/dashboard/superadmin/users/church-admins/create" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            Add church admin
          </Link>
          <Link href="/dashboard/superadmin/churches/create" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            Add church
          </Link>
          <Link href="/dashboard/superadmin/conferences/create" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            Add conference
          </Link>
        </div>
      </div>
    </div>
  );
}

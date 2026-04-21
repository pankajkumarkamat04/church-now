'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  Calendar,
  CreditCard,
  HandCoins,
  FolderOpen,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/lib/api';

export type PanelVariant = 'admin' | 'superadmin';

const roleForVariant: Record<PanelVariant, Role> = {
  admin: 'ADMIN',
  superadmin: 'SUPERADMIN',
};

const panelMeta: Record<
  PanelVariant,
  {
    title: string;
    tagline: string;
    badge: string;
    navActive: string;
    navIdle: string;
    badgeStyle: string;
    rolePill: string;
  }
> = {
  admin: {
    title: 'Church admin',
    tagline: 'Lead your congregation',
    badge: 'Admin',
    navActive:
      'bg-sky-50 text-sky-900 border-sky-200 shadow-sm',
    navIdle:
      'text-neutral-600 border-transparent hover:bg-neutral-50 hover:text-neutral-900',
    badgeStyle: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200/80',
    rolePill: 'bg-sky-50 text-sky-800 ring-sky-200/60',
  },
  superadmin: {
    title: 'Superadmin',
    tagline: 'System control',
    badge: 'Superadmin',
    navActive:
      'bg-violet-50 text-violet-900 border-violet-200 shadow-sm',
    navIdle:
      'text-neutral-600 border-transparent hover:bg-neutral-50 hover:text-neutral-900',
    badgeStyle: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200/80',
    rolePill: 'bg-violet-50 text-violet-900 ring-violet-200/60',
  },
};

type NavItem = { href: string; label: string; icon: React.ReactNode };

function isNavActive(pathname: string, href: string, variant: PanelVariant) {
  if (variant === 'admin') {
    if (href === '/dashboard/admin/members') {
      return pathname === href || pathname.startsWith('/dashboard/admin/members/');
    }
    if (href === '/dashboard/admin/subscriptions') {
      return pathname === href || pathname.startsWith('/dashboard/admin/subscriptions/');
    }
    if (href === '/dashboard/admin/tithes') {
      return pathname === href || pathname.startsWith('/dashboard/admin/tithes/');
    }
    return pathname === href;
  }
  if (href === '/dashboard/superadmin') {
    return pathname === '/dashboard/superadmin';
  }
  if (href === '/dashboard/superadmin/frontend') {
    return pathname === '/dashboard/superadmin/frontend';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navItemsFor(variant: PanelVariant): NavItem[] {
  if (variant === 'superadmin') {
    return [
      {
        href: '/dashboard/superadmin',
        label: 'Overview',
        icon: <LayoutDashboard className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/churches',
        label: 'Church',
        icon: <Building2 className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/conferences',
        label: 'Conference',
        icon: <Building2 className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/churches/councils',
        label: 'Councils',
        icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/pastors',
        label: 'Pastor records',
        icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/users',
        label: 'Members',
        icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/admins',
        label: 'Admins',
        icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/events',
        label: 'Events',
        icon: <Calendar className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/gallery',
        label: 'Gallery',
        icon: <ImageIcon className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/media',
        label: 'Media',
        icon: <FolderOpen className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/subscriptions',
        label: 'Subscriptions',
        icon: <CreditCard className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/tithes',
        label: 'Tithes',
        icon: <HandCoins className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/church-change-requests',
        label: 'Church change',
        icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
      {
        href: '/dashboard/superadmin/frontend',
        label: 'Frontend',
        icon: <LayoutTemplate className="size-4 shrink-0 opacity-80" aria-hidden />,
      },
    ];
  }

  const base = '/dashboard/admin/members';
  const items: NavItem[] = [
    {
      href: base,
      label: 'Dashboard',
      icon: <LayoutDashboard className="size-4 shrink-0 opacity-80" aria-hidden />,
    },
  ];

  items.push({
    href: '/dashboard/admin/pastors',
    label: 'Pastor records',
    icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
  });
  items.push({
    href: '/dashboard/admin/councils',
    label: 'Councils',
    icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
  });
  items.push({
    href: '/dashboard/admin/attendance',
    label: 'Attendance',
    icon: <Calendar className="size-4 shrink-0 opacity-80" aria-hidden />,
  });
  items.push({
    href: '/dashboard/admin/subscriptions',
    label: 'Subscriptions',
    icon: <CreditCard className="size-4 shrink-0 opacity-80" aria-hidden />,
  });
  items.push({
    href: '/dashboard/admin/tithes',
    label: 'Tithes',
    icon: <HandCoins className="size-4 shrink-0 opacity-80" aria-hidden />,
  });

  return items;
}

export function PanelLayout({
  variant,
  children,
}: {
  variant: PanelVariant;
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const required = roleForVariant[variant];
  const meta = panelMeta[variant];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== required) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [loading, user, required, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !user || user.role !== required) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
          <p className="text-sm text-neutral-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const nav = navItemsFor(variant);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-neutral-200 bg-white shadow-sm transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-6">
          <div className="mb-8 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                {meta.title}
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{meta.tagline}</p>
              <span
                className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeStyle}`}
              >
                {meta.badge}
              </span>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active = isNavActive(pathname, item.href, variant);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    active ? meta.navActive : meta.navIdle
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 border-t border-neutral-200 pt-4">
            <div className="rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200/80">
              <p className="truncate text-sm font-medium text-neutral-900">
                {user.fullName || user.email}
              </p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <Home className="size-4" />
              Home
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-neutral-900/20 backdrop-blur-[2px] lg:hidden"
          aria-label="Close overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className={`hidden rounded-lg p-1.5 sm:inline-flex ${meta.badgeStyle}`}>
                  {variant === 'superadmin' ? (
                    <Shield className="size-4" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </span>
                <div>
                  <h1 className="text-sm font-semibold text-neutral-900 sm:text-base">
                    {meta.title}
                  </h1>
                  <p className="text-xs text-neutral-500">{meta.tagline}</p>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${meta.rolePill}`}
              >
                {user.role}
              </span>
            </div>
          </div>
        </header>

        <div className="px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </div>
    </div>
  );
}

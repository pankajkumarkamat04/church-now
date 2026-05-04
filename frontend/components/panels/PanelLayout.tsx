'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  FolderOpen,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Shield,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';
import { BrandIdentity } from '@/components/branding/BrandIdentity';
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

/** Shared class for every sidebar nav row: top links, group headers, and nested links. */
const NAV_ITEM_ROW =
  'flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition';

type NavItem = { href: string; label: string; icon: React.ReactNode };

type AdminNavGroup = {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: { href: string; label: string; icon?: React.ReactNode }[];
};

function isNavActive(pathname: string, href: string, variant: PanelVariant) {
  if (variant === 'admin') {
    if (href === '/dashboard/admin') {
      return pathname === href;
    }
    if (href === '/dashboard/admin/members') {
      return pathname === href || pathname.startsWith('/dashboard/admin/members/');
    }
    if (href === '/dashboard/admin/finance') {
      return pathname === '/dashboard/admin/finance';
    }
    if (href === '/dashboard/member') {
      return pathname === href || pathname.startsWith('/dashboard/member/');
    }
    if (
      href === '/dashboard/admin/finance/reports' ||
      href === '/dashboard/admin/finance/expenses' ||
      href === '/dashboard/admin/finance/assets' ||
      href === '/dashboard/admin/payments'
    ) {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return pathname === href;
  }
  if (variant === 'superadmin') {
    if (href === '/dashboard/superadmin') {
      return pathname === '/dashboard/superadmin';
    }
    if (href === '/dashboard/superadmin/finance') {
      return pathname === '/dashboard/superadmin/finance';
    }
    if (
      href === '/dashboard/superadmin/finance/reports' ||
      href === '/dashboard/superadmin/finance/expenses' ||
      href === '/dashboard/superadmin/finance/assets' ||
      href === '/dashboard/superadmin/finance/remittances' ||
      href === '/dashboard/superadmin/payments'
    ) {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === '/dashboard/superadmin') {
    return pathname === '/dashboard/superadmin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SUPER_DASHBOARD_LINK: NavItem = {
  href: '/dashboard/superadmin',
  label: 'Dashboard',
  icon: <LayoutDashboard className="size-4 shrink-0 opacity-80" aria-hidden />,
};

const SUPER_SETTINGS_LINK: NavItem = {
  href: '/dashboard/superadmin/settings',
  label: 'Settings',
  icon: <UserCog className="size-4 shrink-0 opacity-80" aria-hidden />,
};

function superadminNavGroups(): AdminNavGroup[] {
  return [
    {
      id: 'congregations',
      label: 'Congregations',
      icon: <Building2 className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/superadmin/churches', label: 'Churches', icon: <Building2 className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/conferences', label: 'Conferences', icon: <Building2 className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/councils', label: 'Councils', icon: <Users className="size-3.5 opacity-70" /> },
        {
          href: '/dashboard/superadmin/churches/service-councils',
          label: 'Service Councils',
          icon: <Users className="size-3.5 opacity-70" />,
        },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/superadmin/users', label: 'Members', icon: <Users className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/admins', label: 'Admins', icon: <Shield className="size-3.5 opacity-70" /> },
        {
          href: '/dashboard/superadmin/church-change-requests',
          label: 'Church change',
          icon: <UserCog className="size-3.5 opacity-70" />,
        },
        {
          href: '/dashboard/superadmin/settings',
          label: 'System settings',
          icon: <Shield className="size-3.5 opacity-70" />,
        },
      ],
    },
    {
      id: 'leadership',
      label: 'Leadership',
      icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/superadmin/pastors', label: 'Record keeping', icon: <Shield className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/pastor-terms', label: 'Leader terms', icon: <Shield className="size-3.5 opacity-70" /> },
      ],
    },
    {
      id: 'programs',
      label: 'Programs',
      icon: <Calendar className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/superadmin/attendance', label: 'Attendance', icon: <Calendar className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/events', label: 'Events', icon: <Calendar className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/media', label: 'Media', icon: <FolderOpen className="size-3.5 opacity-70" /> },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <Megaphone className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [{ href: '/dashboard/superadmin/announcements', label: 'Announcements', icon: <Megaphone className="size-3.5 opacity-70" /> }],
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: <Wallet className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/superadmin/finance', label: 'Overview', icon: <LayoutDashboard className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/payments', label: 'Payments', icon: <Wallet className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/finance/remittances', label: 'Remittances', icon: <Wallet className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/finance/expenses', label: 'Expenses', icon: <Wallet className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/finance/assets', label: 'Assets', icon: <Building2 className="size-3.5 opacity-70" /> },
        { href: '/dashboard/superadmin/finance/reports', label: 'Reports', icon: <BarChart3 className="size-3.5 opacity-70" /> },
      ],
    },
  ];
}

function superadminPathInGroup(
  groupId: string,
  pathname: string
): boolean {
  if (groupId === 'congregations') {
    return (
      pathname.startsWith('/dashboard/superadmin/churches') ||
      pathname.startsWith('/dashboard/superadmin/conferences') ||
      pathname.startsWith('/dashboard/superadmin/councils')
    );
  }
  if (groupId === 'users') {
    return (
      pathname.startsWith('/dashboard/superadmin/users') ||
      pathname.startsWith('/dashboard/superadmin/admins') ||
      pathname.startsWith('/dashboard/superadmin/church-change-requests') ||
      pathname.startsWith('/dashboard/superadmin/settings')
    );
  }
  if (groupId === 'leadership') {
    return (
      pathname.startsWith('/dashboard/superadmin/pastors') || pathname.startsWith('/dashboard/superadmin/pastor-terms')
    );
  }
  if (groupId === 'programs') {
    return (
      pathname.startsWith('/dashboard/superadmin/attendance') ||
      pathname.startsWith('/dashboard/superadmin/events') ||
      pathname.startsWith('/dashboard/superadmin/media')
    );
  }
  if (groupId === 'communication') {
    return pathname.startsWith('/dashboard/superadmin/announcements');
  }
  if (groupId === 'finance') {
    return (
      pathname === '/dashboard/superadmin/finance' ||
      pathname.startsWith('/dashboard/superadmin/finance/') ||
      pathname.startsWith('/dashboard/superadmin/payments')
    );
  }
  return false;
}

function adminNavGroups(): AdminNavGroup[] {
  return [
    {
      id: 'finance',
      label: 'Finance',
      icon: <Wallet className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/admin/finance', label: 'Overview', icon: <LayoutDashboard className="size-3.5 opacity-70" /> },
        { href: '/dashboard/admin/payments', label: 'Payments', icon: <Wallet className="size-3.5 opacity-70" /> },
        { href: '/dashboard/admin/finance/expenses', label: 'Expenses', icon: <Wallet className="size-3.5 opacity-70" /> },
        { href: '/dashboard/admin/finance/assets', label: 'Assets', icon: <Building2 className="size-3.5 opacity-70" /> },
        { href: '/dashboard/admin/finance/reports', label: 'Reports', icon: <BarChart3 className="size-3.5 opacity-70" /> },
      ],
    },
  ];
}

const ADMIN_DASHBOARD_LINK: NavItem = {
  href: '/dashboard/admin',
  label: 'Dashboard',
  icon: <LayoutDashboard className="size-4 shrink-0 opacity-80" aria-hidden />,
};

const ADMIN_MEMBERS_LINK: NavItem = {
  href: '/dashboard/admin/members',
  label: 'Members',
  icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
};

const ADMIN_MIDDLE_LINKS: NavItem[] = [
  {
    href: '/dashboard/admin/pastors',
    label: 'Record keeping',
    icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/pastor-terms',
    label: 'Leader terms',
    icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/announcements',
    label: 'Announcements',
    icon: <Megaphone className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/councils',
    label: 'Councils',
    icon: <Users className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/attendance',
    label: 'Attendance',
    icon: <Calendar className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/events',
    label: 'Events',
    icon: <Calendar className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/media',
    label: 'Media',
    icon: <FolderOpen className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
];

function resolveAdminChurchRole(user: {
  memberRoleDisplay?: string;
  memberRolesFromChurch?: string[];
  memberCategory?: string;
}): string {
  const display = String(user.memberRoleDisplay || '').trim();
  if (display) return display;
  const firstRole = Array.isArray(user.memberRolesFromChurch) ? String(user.memberRolesFromChurch[0] || '').trim() : '';
  if (firstRole) return firstRole;
  const category = String(user.memberCategory || '').trim();
  return category || 'Pastor';
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
  const [adminFinanceOpen, setAdminFinanceOpen] = useState(false);
  const [saGroupOpen, setSaGroupOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    for (const g of superadminNavGroups()) o[g.id] = false;
    return o;
  });
  const required = roleForVariant[variant];
  const meta = panelMeta[variant];
  const adminChurchRoleLabel = variant === 'admin' ? resolveAdminChurchRole(user || {}) : '';

  const adminPathFinance =
    pathname === '/dashboard/admin/finance' ||
    pathname.startsWith('/dashboard/admin/finance/') ||
    pathname.startsWith('/dashboard/admin/payments');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== required) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [loading, user, required, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (variant === 'admin' && adminPathFinance) setAdminFinanceOpen(true);
  }, [variant, pathname, adminPathFinance]);

  useEffect(() => {
    if (variant !== 'superadmin') return;
    setSaGroupOpen((prev) => {
      const next = { ...prev };
      for (const g of superadminNavGroups()) {
        if (superadminPathInGroup(g.id, pathname)) next[g.id] = true;
      }
      return next;
    });
  }, [variant, pathname]);

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

  const adminGroups = adminNavGroups();

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-neutral-200 bg-white shadow-sm transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-6">
          <div className="mb-8 flex items-start justify-between gap-2">
            <BrandIdentity
              wrapperClassName="flex items-center"
              logoClassName="size-10 rounded-md object-cover ring-1 ring-neutral-200"
              textClassName="text-base font-semibold text-neutral-900"
            />
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
            {variant === 'admin' ? (
              <>
                <Link
                  key={ADMIN_DASHBOARD_LINK.href}
                  href={ADMIN_DASHBOARD_LINK.href}
                  className={`${NAV_ITEM_ROW} ${
                    isNavActive(pathname, ADMIN_DASHBOARD_LINK.href, variant) ? meta.navActive : meta.navIdle
                  }`}
                >
                  {ADMIN_DASHBOARD_LINK.icon}
                  {ADMIN_DASHBOARD_LINK.label}
                </Link>
                <Link
                  key={ADMIN_MEMBERS_LINK.href}
                  href={ADMIN_MEMBERS_LINK.href}
                  className={`${NAV_ITEM_ROW} ${
                    isNavActive(pathname, ADMIN_MEMBERS_LINK.href, variant) ? meta.navActive : meta.navIdle
                  }`}
                >
                  {ADMIN_MEMBERS_LINK.icon}
                  {ADMIN_MEMBERS_LINK.label}
                </Link>

                {adminGroups.map((group) => {
                  const isOpen = adminFinanceOpen;
                  const setOpen = setAdminFinanceOpen;
                  const groupHasActive = adminPathFinance;
                  return (
                    <div key={group.id} className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={isOpen}
                        className={`${NAV_ITEM_ROW} justify-between text-left ${
                          groupHasActive ? meta.navActive : meta.navIdle
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {group.icon}
                          {group.label}
                        </span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-neutral-500 transition ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <ul className="mt-0.5 space-y-0.5" role="list">
                          {group.children.map((child) => {
                            const subActive = isNavActive(pathname, child.href, variant);
                            return (
                              <li key={child.href} className="pl-1">
                                <Link
                                  href={child.href}
                                  className={`${NAV_ITEM_ROW} ${
                                    subActive ? meta.navActive : meta.navIdle
                                  }`}
                                >
                                  {child.icon}
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
                {ADMIN_MIDDLE_LINKS.map((item) => {
                  const active = isNavActive(pathname, item.href, variant);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${NAV_ITEM_ROW} ${active ? meta.navActive : meta.navIdle}`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                <Link
                  key={SUPER_DASHBOARD_LINK.href}
                  href={SUPER_DASHBOARD_LINK.href}
                  className={`${NAV_ITEM_ROW} ${
                    isNavActive(pathname, SUPER_DASHBOARD_LINK.href, variant) ? meta.navActive : meta.navIdle
                  }`}
                >
                  {SUPER_DASHBOARD_LINK.icon}
                  {SUPER_DASHBOARD_LINK.label}
                </Link>
                {superadminNavGroups().map((group) => {
                  const isOpen = saGroupOpen[group.id] ?? false;
                  const groupHasActive = superadminPathInGroup(group.id, pathname);
                  return (
                    <div key={group.id} className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSaGroupOpen((s) => ({
                            ...s,
                            [group.id]: !(s[group.id] ?? false),
                          }))
                        }
                        aria-expanded={isOpen}
                        className={`${NAV_ITEM_ROW} justify-between text-left ${
                          groupHasActive ? meta.navActive : meta.navIdle
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {group.icon}
                          {group.label}
                        </span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-neutral-500 transition ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <ul className="mt-0.5 space-y-0.5" role="list">
                          {group.children.map((child) => {
                            const subActive = isNavActive(pathname, child.href, variant);
                            return (
                              <li key={child.href} className="pl-1">
                                <Link
                                  href={child.href}
                                  className={`${NAV_ITEM_ROW} ${
                                    subActive ? meta.navActive : meta.navIdle
                                  }`}
                                >
                                  {child.icon}
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
                <Link
                  key={SUPER_SETTINGS_LINK.href}
                  href={SUPER_SETTINGS_LINK.href}
                  className={`${NAV_ITEM_ROW} ${
                    isNavActive(pathname, SUPER_SETTINGS_LINK.href, variant) ? meta.navActive : meta.navIdle
                  }`}
                >
                  {SUPER_SETTINGS_LINK.icon}
                  {SUPER_SETTINGS_LINK.label}
                </Link>
              </>
            )}
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
              className={`${NAV_ITEM_ROW} ${meta.navIdle}`}
            >
              <Home className="size-4 shrink-0 opacity-80" />
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

      <div className="w-full min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
          <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="shrink-0 rounded-lg p-2.5 text-neutral-600 hover:bg-neutral-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-neutral-900 sm:text-base">
                    {meta.title}
                  </h1>
                  <p className="truncate text-xs text-neutral-500">{meta.tagline}</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ring-1 sm:px-3 sm:text-xs ${meta.rolePill}`}
              >
                {variant === 'admin' ? adminChurchRoleLabel : user.role}
              </span>
            </div>
          </div>
        </header>

        <div className="w-full min-w-0 max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}

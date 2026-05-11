'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Shield,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { getDefaultDashboardPath, useAuth } from '@/contexts/AuthContext';
import { BrandIdentity } from '@/components/branding/BrandIdentity';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AppFooter } from '@/components/layout/AppFooter';
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
    title: 'Superadmin dashboard',
    tagline: 'Control center',
    badge: 'Superadmin',
    navActive:
      'bg-violet-50 text-violet-900 border-violet-200 shadow-sm',
    navIdle:
      'text-neutral-600 border-transparent hover:bg-neutral-50 hover:text-neutral-900',
    badgeStyle: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200/80',
    rolePill: 'bg-violet-50 text-violet-900 ring-violet-200/60',
  },
};

/** Top-level nav links (Dashboard, Settings) */
const NAV_TOP_LINK =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors';

/** Accordion group header button */
const NAV_GROUP_BTN =
  'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors';

/** Sub-menu item link */
const NAV_SUB_ITEM =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

type NavItem = { href: string; label: string; icon: React.ReactNode };

type AdminNavGroup = {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: { href: string; label: string; icon?: React.ReactNode }[];
};

function isNavActive(pathname: string, href: string, variant: PanelVariant) {
  if (variant === 'admin') {
    if (href === '/dashboard/conference-leader') {
      return pathname.startsWith('/dashboard/conference-leader');
    }
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
          href: '/dashboard/superadmin/pending-approvals',
          label: 'Pending Approvals',
          icon: <UserCheck className="size-3.5 opacity-70" />,
        },
        {
          href: '/dashboard/superadmin/church-change-requests',
          label: 'Church change',
          icon: <UserCog className="size-3.5 opacity-70" />,
        },
      ],
    },
    {
      id: 'leadership',
      label: 'Leadership',
      icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
      children: [
        { href: '/dashboard/superadmin/pastor-management', label: 'Pastor Management', icon: <UserCog className="size-3.5 opacity-70" /> },
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
      pathname.startsWith('/dashboard/superadmin/pending-approvals') ||
      pathname.startsWith('/dashboard/superadmin/church-change-requests')
    );
  }
  if (groupId === 'leadership') {
    return (
      pathname.startsWith('/dashboard/superadmin/pastor-management') ||
      pathname.startsWith('/dashboard/superadmin/pastors') ||
      pathname.startsWith('/dashboard/superadmin/pastor-terms')
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

const ADMIN_PENDING_LINK: NavItem = {
  href: '/dashboard/admin/pending-approvals',
  label: 'Pending Approvals',
  icon: <Clock className="size-4 shrink-0 opacity-80" aria-hidden />,
};

const ADMIN_MIDDLE_LINKS: NavItem[] = [
  {
    href: '/dashboard/admin/pastors',
    label: 'Pastors (View)',
    icon: <Shield className="size-4 shrink-0 opacity-80" aria-hidden />,
  },
  {
    href: '/dashboard/admin/pastor-terms',
    label: 'Leader terms (View)',
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
        className={`fixed inset-y-0 left-0 z-40 w-[88vw] max-w-80 border-r border-neutral-200 bg-white shadow-lg transition-transform duration-200 ease-out sm:w-72 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="sidebar-scrollbar flex h-full flex-col overflow-y-auto pb-6">
          {/* ── Logo / Brand ── */}
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-4">
            <BrandIdentity
              wrapperClassName="flex items-center gap-3"
              logoClassName="size-9 rounded-lg object-cover ring-1 ring-neutral-200"
              textClassName="text-sm font-semibold text-neutral-900 leading-tight"
            />
            <button
              type="button"
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ── User card ── */}
          <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-200/70">
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${variant === 'superadmin' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
              {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-900">{user.fullName || user.email}</p>
              <p className="truncate text-[10px] text-neutral-400">{user.email}</p>
            </div>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${meta.badgeStyle}`}>
              {meta.badge}
            </span>
          </div>

          {/* ── Nav ── */}
          <nav className="mt-4 flex flex-1 flex-col gap-0.5 px-3">
            {variant === 'admin' ? (
              <>
                {/* Dashboard */}
                <Link
                  href={ADMIN_DASHBOARD_LINK.href}
                  className={`${NAV_TOP_LINK} ${isNavActive(pathname, ADMIN_DASHBOARD_LINK.href, variant) ? meta.navActive : meta.navIdle}`}
                >
                  {ADMIN_DASHBOARD_LINK.icon}
                  {ADMIN_DASHBOARD_LINK.label}
                </Link>

                {/* Members */}
                <Link
                  href={ADMIN_MEMBERS_LINK.href}
                  className={`${NAV_TOP_LINK} ${isNavActive(pathname, ADMIN_MEMBERS_LINK.href, variant) ? meta.navActive : meta.navIdle}`}
                >
                  {ADMIN_MEMBERS_LINK.icon}
                  {ADMIN_MEMBERS_LINK.label}
                </Link>

                {/* Pending Approvals */}
                <Link
                  href={ADMIN_PENDING_LINK.href}
                  className={`${NAV_TOP_LINK} ${isNavActive(pathname, ADMIN_PENDING_LINK.href, variant) ? meta.navActive : meta.navIdle}`}
                >
                  {ADMIN_PENDING_LINK.icon}
                  {ADMIN_PENDING_LINK.label}
                </Link>

                {user.isConferenceLeader ? (
                  <Link
                    href="/dashboard/conference-leader"
                    className={`${NAV_TOP_LINK} ${isNavActive(pathname, '/dashboard/conference-leader', variant) ? meta.navActive : meta.navIdle}`}
                  >
                    <Landmark className="size-4 shrink-0 opacity-80" aria-hidden />
                    Conference leader
                  </Link>
                ) : null}

                {/* Finance accordion */}
                {adminGroups.map((group) => {
                  const isOpen = adminFinanceOpen;
                  const groupHasActive = adminPathFinance;
                  return (
                    <div key={group.id}>
                      <button
                        type="button"
                        onClick={() => setAdminFinanceOpen((v) => !v)}
                        aria-expanded={isOpen}
                        className={`${NAV_GROUP_BTN} mt-1 ${groupHasActive ? 'text-sky-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}
                      >
                        <span className="flex items-center gap-2">
                          {group.icon}
                          {group.label}
                        </span>
                        <ChevronDown className={`size-3.5 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                      {isOpen && (
                        <div className="ml-3 mt-1 border-l-2 border-neutral-100 pl-3 pb-1 space-y-0.5">
                          {group.children.map((child) => {
                            const subActive = isNavActive(pathname, child.href, variant);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`${NAV_SUB_ITEM} ${subActive ? meta.navActive : meta.navIdle}`}
                              >
                                {child.icon}
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Divider */}
                <div className="my-2 border-t border-neutral-100" />

                {/* Middle links */}
                {ADMIN_MIDDLE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${NAV_TOP_LINK} ${isNavActive(pathname, item.href, variant) ? meta.navActive : meta.navIdle}`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </>
            ) : (
              <>
                {/* Dashboard */}
                <Link
                  href={SUPER_DASHBOARD_LINK.href}
                  className={`${NAV_TOP_LINK} ${isNavActive(pathname, SUPER_DASHBOARD_LINK.href, variant) ? meta.navActive : meta.navIdle}`}
                >
                  {SUPER_DASHBOARD_LINK.icon}
                  {SUPER_DASHBOARD_LINK.label}
                </Link>

                <div className="my-1 border-t border-neutral-100" />

                {/* Accordion groups */}
                {superadminNavGroups().map((group, gIdx) => {
                  const isOpen = saGroupOpen[group.id] ?? false;
                  const groupHasActive = superadminPathInGroup(group.id, pathname);
                  const groups = superadminNavGroups();
                  const isLast = gIdx === groups.length - 1;
                  return (
                    <div key={group.id} className={isLast ? '' : 'mb-0.5'}>
                      <button
                        type="button"
                        onClick={() => setSaGroupOpen((s) => ({ ...s, [group.id]: !(s[group.id] ?? false) }))}
                        aria-expanded={isOpen}
                        className={`${NAV_GROUP_BTN} ${groupHasActive ? 'text-violet-700 bg-violet-50/60' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}
                      >
                        <span className="flex items-center gap-2">
                          {group.icon}
                          {group.label}
                        </span>
                        <ChevronDown className={`size-3.5 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                      {isOpen && (
                        <div className="ml-3 mt-1 border-l-2 border-neutral-100 dark:border-neutral-700 pl-3 pb-2 space-y-0.5">
                          {group.children.map((child) => {
                            const subActive = isNavActive(pathname, child.href, variant);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`${NAV_SUB_ITEM} ${subActive ? `${meta.navActive} font-semibold` : meta.navIdle}`}
                              >
                                {child.icon && <span className="shrink-0">{child.icon}</span>}
                                <span className="truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </nav>

          {/* ── Footer ── */}
          <div className="mt-4 space-y-1.5 border-t border-neutral-100 px-3 pt-4">
            <button
              type="button"
              onClick={() => { logout(); router.replace('/login'); }}
              className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 hover:text-red-700"
            >
              <LogOut className="size-4 shrink-0" />
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

      <div className="flex min-h-screen w-full min-w-0 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
          <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 sm:text-base">{meta.title}</p>
                <p className="truncate text-xs text-neutral-400">{meta.tagline}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <span className={`hidden whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 sm:inline-flex sm:text-xs ${meta.rolePill}`}>
                {variant === 'admin' ? adminChurchRoleLabel : user.role}
              </span>
            </div>
          </div>
        </header>

        <div className="dashboard-content w-full min-w-0 max-w-full flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-10">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}

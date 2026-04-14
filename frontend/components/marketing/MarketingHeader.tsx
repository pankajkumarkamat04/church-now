'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Church, Menu, X } from 'lucide-react';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';

const marketingNav = [
  { href: '#about', label: 'About' },
  { href: '#events', label: 'Events' },
  { href: '#gallery', label: 'Gallery' },
];

export type MarketingHeaderProps = {
  variant?: 'marketing' | 'platform';
};

export function MarketingHeader({ variant = 'marketing' }: MarketingHeaderProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const showMarketingNav = variant === 'marketing';
  const dashboardHref = user ? dashboardPathForRole(user.role) : '/login';
  const ctaLabel = user ? 'Dashboard' : 'Login / Register';

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-neutral-900">
          <span className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
            <Church className="size-4 text-neutral-700" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Church OS</span>
        </Link>

        {showMarketingNav ? (
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {marketingNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : (
          <span className="hidden md:block" aria-hidden />
        )}

        <div className="flex items-center gap-2">
          <Link
            href={dashboardHref}
            className="rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {showMarketingNav
              ? marketingNav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ))
              : null}
            <Link
              href={dashboardHref}
              className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              onClick={() => setOpen(false)}
            >
              {ctaLabel}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

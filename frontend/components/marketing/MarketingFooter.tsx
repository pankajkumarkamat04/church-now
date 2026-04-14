import Link from 'next/link';
import { Church } from 'lucide-react';

export type MarketingFooterProps = {
};

export function MarketingFooter(_: MarketingFooterProps) {
  const explore = [
    { href: '/#about', label: 'About' },
    { href: '/#events', label: 'Events' },
    { href: '/#gallery', label: 'Gallery' },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-900">
              <span className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white">
                <Church className="size-4 text-neutral-700" aria-hidden />
              </span>
              <span className="text-sm font-semibold">Church OS</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
              Websites, events, galleries, and member tools for churches—kept simple.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Explore
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {explore.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-neutral-600 hover:text-neutral-900">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Account
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/signup" className="text-neutral-600 hover:text-neutral-900">
                  Sign up
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="text-neutral-600 hover:text-neutral-900">
                  Forgot password
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-neutral-200 pt-8 text-xs text-neutral-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Church OS</p>
          <p>Faith · Community · Technology</p>
        </div>
      </div>
    </footer>
  );
}

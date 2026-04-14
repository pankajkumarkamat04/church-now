'use client';

import { usePathname } from 'next/navigation';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';

const RESERVED_FIRST_SEGMENTS = new Set([
  'login',
  'signup',
  'forgot-password',
  'reset-password',
  'dashboard',
]);

function churchSlugFromPathname(pathname: string): string | undefined {
  const first = pathname.split('/').filter(Boolean)[0];
  if (!first || RESERVED_FIRST_SEGMENTS.has(first)) return undefined;
  return first;
}

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const churchSlug = churchSlugFromPathname(pathname);
  const headerVariant = pathname === '/' ? 'marketing' : 'platform';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader variant={headerVariant} />
      <div className="flex flex-1 flex-col">{children}</div>
      <MarketingFooter churchSlug={churchSlug} />
    </div>
  );
}

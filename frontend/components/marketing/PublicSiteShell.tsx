'use client';

import { usePathname } from 'next/navigation';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const headerVariant = pathname === '/' ? 'marketing' : 'platform';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader variant={headerVariant} />
      <div className="flex flex-1 flex-col">{children}</div>
      <MarketingFooter />
    </div>
  );
}

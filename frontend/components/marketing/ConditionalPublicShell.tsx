'use client';

import { usePathname } from 'next/navigation';
import { PublicSiteShell } from '@/components/marketing/PublicSiteShell';

export function ConditionalPublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) {
    return <>{children}</>;
  }
  return <PublicSiteShell>{children}</PublicSiteShell>;
}

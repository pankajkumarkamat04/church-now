'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy church-scoped council edit URL → global councils list. */
export default function SuperadminChurchCouncilsEditRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/superadmin/councils');
  }, [router]);
  return null;
}

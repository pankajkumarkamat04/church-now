'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperadminChurchCouncilsEditRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/superadmin/councils');
  }, [router]);
  return null;
}

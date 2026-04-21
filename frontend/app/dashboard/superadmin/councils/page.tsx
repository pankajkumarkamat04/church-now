'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacySuperadminCouncilsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/superadmin/churches/councils');
  }, [router]);
  return null;
}

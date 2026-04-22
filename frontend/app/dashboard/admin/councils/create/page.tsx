'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCouncilsCreateRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin/councils');
  }, [router]);
  return null;
}

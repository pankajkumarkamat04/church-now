'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin/members');
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
      Redirecting…
    </div>
  );
}

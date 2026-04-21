'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Old conference routes removed; land users on the member home (church + conference live there). */
export default function MemberConferencesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/member');
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
      Redirecting to your dashboard…
    </div>
  );
}

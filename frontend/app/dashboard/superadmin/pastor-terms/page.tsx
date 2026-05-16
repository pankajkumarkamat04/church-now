'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — leader terms now live under Pastor Management. */
export default function SuperadminPastorTermsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/superadmin/pastor-management?tab=terms');
  }, [router]);

  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-neutral-500">
      Redirecting to Pastor Management…
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';

export default function DashboardIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(dashboardPathForRole(user.role));
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="flex flex-col items-center gap-3 text-neutral-500">
        <Loader2 className="size-8 animate-spin text-violet-600" />
        <p className="text-sm">Opening your panel…</p>
      </div>
    </div>
  );
}

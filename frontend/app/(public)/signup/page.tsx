'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Church } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { dashboardPathForRole, useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [loading, user, router]);

  return (
    <AuthShell maxWidthClassName="max-w-lg">
      <div className="mb-6 flex justify-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
          <Church className="size-6 text-neutral-700" aria-hidden />
        </span>
      </div>
      <h1 className="text-center text-xl font-semibold text-neutral-900">Member Access</h1>
      <p className="mt-3 text-center text-sm text-neutral-600">
        Contact your church office to get your member ID and account credentials.
      </p>
      <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Self signup is disabled. Your church admin or superadmin will create your account.
      </div>
      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have your credentials?{' '}
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

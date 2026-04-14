import Link from 'next/link';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center bg-neutral-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back to home
        </Link>
        <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

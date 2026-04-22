/** Shared full-screen session check spinner for protected routes. */
export function AuthLoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-100">
      <div className="size-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

type AuthShellProps = {
  children: React.ReactNode;
  maxWidthClassName?: string;
};

export function AuthShell({ children, maxWidthClassName = 'max-w-md' }: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col justify-center bg-neutral-50 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <div className={`mx-auto w-full min-w-0 ${maxWidthClassName}`}>
        <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

import { BrandIdentity } from '@/components/branding/BrandIdentity';

type AuthShellProps = {
  children: React.ReactNode;
  maxWidthClassName?: string;
};

export function AuthShell({ children, maxWidthClassName = 'max-w-md' }: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col justify-center bg-neutral-50 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <div className={`mx-auto w-full min-w-0 ${maxWidthClassName}`}>
        <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <BrandIdentity
              wrapperClassName="flex items-center justify-center"
              logoClassName="size-12 rounded-lg object-cover ring-1 ring-neutral-200"
              textClassName="text-xl font-bold text-neutral-900"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

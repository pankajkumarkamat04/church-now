import { PASSWORD_REQUIREMENTS_SUMMARY } from '@/lib/passwordPolicy';

type Props = {
  className?: string;
};

export function PasswordRequirementsHint({ className = '' }: Props) {
  return (
    <p className={`text-xs text-neutral-500 ${className}`.trim()} role="note">
      {PASSWORD_REQUIREMENTS_SUMMARY} Do not share your password with anyone.
    </p>
  );
}

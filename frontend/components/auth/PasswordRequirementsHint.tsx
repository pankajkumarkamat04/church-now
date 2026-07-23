import { PASSWORD_REQUIREMENTS_SUMMARY } from '@/lib/passwordPolicy';

type Props = {
  className?: string;
  id?: string;
};

export function PasswordRequirementsHint({ className = '', id }: Props) {
  return (
    <p id={id} className={`text-xs text-neutral-500 ${className}`.trim()} role="note">
      {PASSWORD_REQUIREMENTS_SUMMARY} Do not share your password with anyone.
    </p>
  );
}

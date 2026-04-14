'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export type PasswordInputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'type'> & {
  /** Classes for the show/hide control (e.g. zinc on dark dashboards) */
  toggleClassName?: string;
};

export function PasswordInput({
  className = '',
  toggleClassName = 'text-neutral-500 hover:text-neutral-800',
  id,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${className} pr-10`.trim()}
        {...props}
      />
      <button
        type="button"
        className={`absolute inset-y-0 right-0 flex items-center pr-3 ${toggleClassName}`}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4 shrink-0" aria-hidden /> : <Eye className="size-4 shrink-0" aria-hidden />}
      </button>
    </div>
  );
}

'use client';

import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import {
  DEFAULT_SYSTEM_SETTINGS,
  FOOTER_SUPPORT_PHONE,
  FOOTER_TAGLINE,
  formatSupportPhoneDisplay,
  resolveCopyrightLine,
} from '@/lib/systemSettings';

function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `tel:+${digits}` : '';
}

export function AppFooter({ className = '' }: { className?: string }) {
  const { settings } = useSystemSettings();
  const systemName = settings.systemName || DEFAULT_SYSTEM_SETTINGS.systemName;
  const copyrightLine = resolveCopyrightLine(settings.copyrightText, systemName);
  const phoneDisplay = formatSupportPhoneDisplay(FOOTER_SUPPORT_PHONE);

  return (
    <footer
      className={`border-t border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 ${className}`}
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-5 text-center text-xs sm:px-6 lg:px-8">
        <p>{copyrightLine}</p>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          {FOOTER_TAGLINE}{' '}
          (
          <a
            href={telHref(FOOTER_SUPPORT_PHONE)}
            className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
          >
            {phoneDisplay}
          </a>
          )
        </p>
      </div>
    </footer>
  );
}

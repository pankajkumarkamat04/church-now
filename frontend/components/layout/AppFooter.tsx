'use client';

import { useSystemSettings } from '@/contexts/SystemSettingsContext';

export function AppFooter({ className = '' }: { className?: string }) {
  const { settings } = useSystemSettings();
  const year = new Date().getFullYear();
  const copyrightLine =
    settings.copyrightText || `© ${year} ${settings.systemName || 'Church OS'}. All rights reserved.`;

  return (
    <footer className={`border-t border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 ${className}`}>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-5 text-center text-xs sm:px-6 lg:px-8">
        <p>{copyrightLine}</p>
        {settings.footerText ? <p className="mt-1">{settings.footerText}</p> : null}
      </div>
    </footer>
  );
}

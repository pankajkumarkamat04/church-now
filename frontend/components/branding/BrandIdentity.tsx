'use client';

import { useMemo, useState } from 'react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

type BrandIdentityProps = {
  textClassName?: string;
  logoClassName?: string;
  wrapperClassName?: string;
};

export function BrandIdentity({
  textClassName = 'text-xl font-bold text-neutral-900',
  logoClassName = 'size-9 rounded-md object-cover',
  wrapperClassName = 'flex items-center gap-2',
}: BrandIdentityProps) {
  const { settings } = useSystemSettings();
  const [logoFailed, setLogoFailed] = useState(false);

  const name = useMemo(() => settings.systemName || 'Church OS', [settings.systemName]);
  const logo = settings.systemLogoUrl;
  const showLogo = Boolean(logo) && !logoFailed;

  return (
    <span className={wrapperClassName}>
      {showLogo ? (
        // Use plain img to avoid strict Next/Image host config for dynamic logos.
        <img src={logo} alt={name} className={logoClassName} onError={() => setLogoFailed(true)} />
      ) : (
        <span className={textClassName}>{name}</span>
      )}
    </span>
  );
}

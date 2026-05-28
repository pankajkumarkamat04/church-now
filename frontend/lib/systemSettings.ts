export type SystemSettings = {
  systemName: string;
  systemLogoUrl: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  address: string;
  footerText: string;
  copyrightText: string;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  systemName: 'UCCZ CONNECT',
  systemLogoUrl: '',
  supportEmail: '',
  supportPhone: '+263775656571',
  websiteUrl: '',
  address: '',
  footerText: 'UCCZ Digital Connect powered by Mandvis Tech Solutions',
  copyrightText: '',
};

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

export function currentCopyrightYear(): number {
  return new Date().getFullYear();
}

/** Copyright line when `copyrightText` is empty (year is current). */
export function defaultCopyrightText(systemName = DEFAULT_SYSTEM_SETTINGS.systemName): string {
  return `© ${currentCopyrightYear()} ${systemName}. All rights reserved.`;
}

/**
 * Footer copyright: empty → default; otherwise swap any © year (or lone 4-digit year) for the current year.
 */
export function resolveCopyrightLine(
  copyrightText: string | undefined | null,
  systemName = DEFAULT_SYSTEM_SETTINGS.systemName
): string {
  const trimmed = normalizeString(copyrightText);
  if (!trimmed) return defaultCopyrightText(systemName);

  const year = String(currentCopyrightYear());
  if (/©\s*\d{4}/.test(trimmed)) {
    return trimmed.replace(/©\s*\d{4}/, `© ${year}`);
  }
  if (/\b(19|20)\d{2}\b/.test(trimmed)) {
    return trimmed.replace(/\b(19|20)\d{2}\b/, year);
  }
  return `© ${year} ${trimmed}`;
}

/** Display phone for footer, e.g. +263 775 656 571 */
export function formatSupportPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('263') && digits.length >= 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone.trim();
}

export function normalizeSystemSettings(input: Partial<SystemSettings> | null | undefined): SystemSettings {
  return {
    systemName: normalizeString(input?.systemName) || DEFAULT_SYSTEM_SETTINGS.systemName,
    systemLogoUrl: normalizeString(input?.systemLogoUrl),
    supportEmail: normalizeString(input?.supportEmail),
    supportPhone: normalizeString(input?.supportPhone),
    websiteUrl: normalizeString(input?.websiteUrl),
    address: normalizeString(input?.address),
    footerText: normalizeString(input?.footerText),
    copyrightText: normalizeString(input?.copyrightText),
  };
}

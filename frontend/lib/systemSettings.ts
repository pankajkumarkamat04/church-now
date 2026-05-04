export type SystemSettings = {
  systemName: string;
  systemLogoUrl: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  address: string;
  footerText: string;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  systemName: 'Church OS',
  systemLogoUrl: '',
  supportEmail: '',
  supportPhone: '',
  websiteUrl: '',
  address: '',
  footerText: '',
};

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
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
  };
}

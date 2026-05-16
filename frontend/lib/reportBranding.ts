import { getApiBase } from '@/lib/api';
import type { SystemSettings } from '@/lib/systemSettings';

export type ReportBranding = {
  name: string;
  logoUrl?: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  websiteUrl?: string;
};

export type ChurchBrandingSource = {
  name?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

export function resolveReportAssetUrl(url: string | undefined): string {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  const base = getApiBase().replace(/\/$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function formatCityLine(church: ChurchBrandingSource): string {
  const parts = [
    [church.city, church.stateOrProvince].filter(Boolean).join(', '),
    church.postalCode,
    church.country,
  ].filter((p) => String(p || '').trim());
  return parts.join(' · ').trim();
}

export function churchToReportBranding(
  church: ChurchBrandingSource | null | undefined,
  systemFallback?: SystemSettings | null
): ReportBranding {
  const name = String(church?.name || '').trim() || String(systemFallback?.systemName || '').trim() || 'Church';
  const addressLines: string[] = [];
  const addr = String(church?.address || '').trim() || String(systemFallback?.address || '').trim();
  if (addr) addressLines.push(addr);
  const cityLine = church ? formatCityLine(church) : '';
  if (cityLine) addressLines.push(cityLine);

  const phone = String(church?.phone || '').trim() || String(systemFallback?.supportPhone || '').trim();
  const email = String(church?.email || '').trim() || String(systemFallback?.supportEmail || '').trim();
  const websiteUrl = String(systemFallback?.websiteUrl || '').trim();
  const logoUrl =
    resolveReportAssetUrl(church?.logoUrl) || resolveReportAssetUrl(systemFallback?.systemLogoUrl);

  return {
    name,
    logoUrl: logoUrl || undefined,
    addressLines,
    phone: phone || undefined,
    email: email || undefined,
    websiteUrl: websiteUrl || undefined,
  };
}

export function systemToReportBranding(settings: SystemSettings | null | undefined): ReportBranding {
  const name = String(settings?.systemName || '').trim() || 'Church OS';
  const addressLines: string[] = [];
  const addr = String(settings?.address || '').trim();
  if (addr) addressLines.push(addr);
  return {
    name,
    logoUrl: resolveReportAssetUrl(settings?.systemLogoUrl) || undefined,
    addressLines,
    phone: String(settings?.supportPhone || '').trim() || undefined,
    email: String(settings?.supportEmail || '').trim() || undefined,
    websiteUrl: String(settings?.websiteUrl || '').trim() || undefined,
  };
}

export function brandingContactLine(branding: ReportBranding): string {
  const parts: string[] = [];
  if (branding.phone) parts.push(`Phone: ${branding.phone}`);
  if (branding.email) parts.push(`Email: ${branding.email}`);
  if (branding.websiteUrl) parts.push(branding.websiteUrl);
  return parts.join('  ·  ');
}

/** Rows to prepend on spreadsheet exports (text branding). */
export function brandingSpreadsheetRows(branding: ReportBranding): (string | number)[][] {
  const rows: (string | number)[][] = [[branding.name]];
  for (const line of branding.addressLines) rows.push([line]);
  const contact = brandingContactLine(branding);
  if (contact) rows.push([contact]);
  rows.push([]);
  return rows;
}

type LoadedLogo = {
  dataUrl: string;
  format: 'PNG' | 'JPEG' | 'WEBP';
  width: number;
  height: number;
};

export async function loadLogoForPdf(url: string | undefined): Promise<LoadedLogo | null> {
  const resolved = resolveReportAssetUrl(url);
  if (!resolved) return null;
  try {
    const res = await fetch(resolved);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl.startsWith('data:')) return null;

    const format: LoadedLogo['format'] = blob.type.includes('png')
      ? 'PNG'
      : blob.type.includes('webp')
        ? 'WEBP'
        : 'JPEG';

    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = dataUrl;
    });

    return { dataUrl, format, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

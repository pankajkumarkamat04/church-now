import { getApiBase } from '@/lib/api';

export async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBase()}${path}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { PAYMENT_OPTIONS, PAYMENT_OPTION_LABELS } from '@/lib/payments';

export type ChurchPaymentTypeRow = {
  _id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
};

export function paymentTypeLabelsMap(types: ChurchPaymentTypeRow[]): Record<string, string> {
  const map: Record<string, string> = { ...PAYMENT_OPTION_LABELS };
  for (const t of types) {
    map[t.code] = t.label;
  }
  return map;
}

export function activePaymentTypeCodes(types: ChurchPaymentTypeRow[]): string[] {
  return types.filter((t) => t.isActive).map((t) => t.code);
}

export function emptyAmountsForCodes(codes: string[]): Record<string, string> {
  return Object.fromEntries(codes.map((code) => [code, '']));
}

export async function fetchMemberPaymentTypes(token: string): Promise<ChurchPaymentTypeRow[]> {
  return apiFetch<ChurchPaymentTypeRow[]>('/api/member/payment-types', { token });
}

export async function fetchAdminPaymentTypes(token: string): Promise<ChurchPaymentTypeRow[]> {
  return apiFetch<ChurchPaymentTypeRow[]>('/api/admin/payment-types', { token });
}

/** Active payment types for forms (member portal). */
export function useMemberPaymentTypes(token: string | null) {
  const [types, setTypes] = useState<ChurchPaymentTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setTypes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMemberPaymentTypes(token);
      setTypes(rows.filter((t) => t.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment categories');
      setTypes(
        PAYMENT_OPTIONS.map((code, i) => ({
          _id: code,
          code,
          label: PAYMENT_OPTION_LABELS[code],
          sortOrder: i,
          isActive: true,
          isSystem: true,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const codes = types.map((t) => t.code);
  const labels = paymentTypeLabelsMap(types);

  return { types, codes, labels, loading, error, reload };
}

/** All payment types for admin management. */
export function useAdminPaymentTypes(token: string | null) {
  const [types, setTypes] = useState<ChurchPaymentTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setTypes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTypes(await fetchAdminPaymentTypes(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment categories');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeCodes = activePaymentTypeCodes(types);
  const labels = paymentTypeLabelsMap(types);

  return { types, activeCodes, labels, loading, error, reload };
}

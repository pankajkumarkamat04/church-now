/** Wall-clock inactivity before automatic sign-out (10 minutes). */
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export const INACTIVITY_LOGOUT_REASON_KEY = 'church_inactivity_logout';

export const INACTIVITY_TIMEOUT_MINUTES = 10;

export function setInactivityLogoutFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(INACTIVITY_LOGOUT_REASON_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumeInactivityLogoutFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = sessionStorage.getItem(INACTIVITY_LOGOUT_REASON_KEY);
    if (v) {
      sessionStorage.removeItem(INACTIVITY_LOGOUT_REASON_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

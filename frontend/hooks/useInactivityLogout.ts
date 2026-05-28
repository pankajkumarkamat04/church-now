'use client';

import { useCallback, useEffect, useRef } from 'react';
import { INACTIVITY_TIMEOUT_MS } from '@/lib/inactivityLogout';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

/** Throttle mousemove so moving the pointer does not reset the timer every frame. */
const MOUSEMOVE_THROTTLE_MS = 30_000;

/**
 * Signs the user out after `INACTIVITY_TIMEOUT_MS` without pointer, keyboard, scroll, or touch activity.
 * Also checks elapsed time when the tab becomes visible again.
 */
export function useInactivityLogout(enabled: boolean, onTimeout: () => void) {
  const onTimeoutRef = useRef(onTimeout);
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const scheduleLogout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    lastActivityRef.current = Date.now();
    scheduleLogout();

    const onActivity = () => recordActivity();

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true });
    }

    let lastMoveReset = Date.now();
    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveReset < MOUSEMOVE_THROTTLE_MS) return;
      lastMoveReset = now;
      recordActivity();
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        onTimeoutRef.current();
        return;
      }
      scheduleLogout();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity);
      }
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, recordActivity, scheduleLogout]);
}

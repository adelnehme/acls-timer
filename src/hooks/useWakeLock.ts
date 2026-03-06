import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Wake lock request failed (e.g., low battery)
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      request();

      // Re-acquire on visibility change (tab switch back)
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && enabled) {
          request();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        release();
      };
    } else {
      release();
    }
  }, [enabled, request, release]);
}

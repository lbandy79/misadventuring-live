import { useEffect } from 'react';

/**
 * Keep the GM tablet's screen awake while the spotlight is open.
 * Silently does nothing where the Screen Wake Lock API is unsupported —
 * the show-day checklist covers turning auto-lock off by hand.
 */
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
      } catch {
        // Denied (battery saver, permissions) — nothing to do.
      }
    };

    // The browser drops the lock whenever the tab is hidden; re-take it on return.
    const onVisibility = () => { if (document.visibilityState === 'visible') acquire(); };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release().catch(() => {});
    };
  }, []);
}

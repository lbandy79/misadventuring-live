import { useEffect, useState } from 'react';
import {
  DEFAULT_SESSION,
  subscribeToRumorMill,
  type RumorMillSession,
} from '@mtp/lib/rumors';
import { resolveRumorMillConfig, type RawRumorMillConfig, type RumorMillConfig } from '../config';

/** Live open/closed, Trump Suit and board state for a show. */
export function useRumorMillSession(showId: string | undefined): RumorMillSession {
  const [session, setSession] = useState<RumorMillSession>(DEFAULT_SESSION);
  useEffect(() => {
    if (!showId) {
      setSession(DEFAULT_SESSION);
      return;
    }
    return subscribeToRumorMill(showId, setSession, (err) =>
      console.error('rumor-mill session listener failed:', err),
    );
  }, [showId]);
  return session;
}

export interface LoadedRumorMill {
  /** Firestore episode id (showConfig.showId). */
  showId: string;
  showName: string;
  config: RumorMillConfig;
}

/**
 * Load a show's system JSON and return its Rumor Mill setup, or null when
 * the show has no `showConfig.rumorMill` (or is still loading).
 */
export function useRumorMillForSystem(systemId: string | undefined): LoadedRumorMill | null {
  const [loaded, setLoaded] = useState<LoadedRumorMill | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    if (!systemId) return;
    (async () => {
      try {
        const mod = await import(`../../../../../src/systems/${systemId}.system.json`);
        const showConfig = (mod.default ?? mod)?.showConfig as
          | { showId?: string; showName?: string; rumorMill?: RawRumorMillConfig }
          | undefined;
        if (cancelled || !showConfig?.showId || !showConfig.rumorMill) return;
        setLoaded({
          showId: showConfig.showId,
          showName: showConfig.showName ?? systemId,
          config: resolveRumorMillConfig(showConfig.rumorMill),
        });
      } catch (err) {
        console.error('Could not load rumor mill config:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);
  return loaded;
}

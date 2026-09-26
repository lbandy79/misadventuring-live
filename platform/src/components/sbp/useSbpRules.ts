/**
 * Subscribe to the SBP rules docs once the viewer is known to be cast/admin.
 * Subscribing earlier would just be refused by the Firestore rules.
 */

import { useEffect, useState } from 'react';
import { subscribeToAllSbpRules, type LoadedSbpRules } from '@mtp/lib';

export interface SbpRulesState {
  rules: LoadedSbpRules;
  /** True until both docs have reported (present or absent). */
  loading: boolean;
  error: string | null;
}

export function useSbpRules(enabled: boolean): SbpRulesState {
  const [rules, setRules] = useState<LoadedSbpRules>({ classes: null, origins: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let reports = 0;
    const unsub = subscribeToAllSbpRules(
      (next) => {
        setRules(next);
        reports += 1;
        if (reports >= 2) setLoading(false);
      },
      (err) => {
        console.error('sbp-rules subscription failed:', err);
        setError('Could not load the rules. Are you on the cast list?');
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled]);

  return { rules, loading: enabled ? loading : true, error };
}

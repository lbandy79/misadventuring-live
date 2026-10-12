/**
 * Subscribe to the SBP rules docs once the viewer is known to be cast/admin.
 * Subscribing earlier would just be refused by the Firestore rules.
 */

import { useEffect, useState } from 'react';
import { EMPTY_SBP_RULES, subscribeToAllSbpRules, type LoadedSbpRules } from '@mtp/lib';

export interface SbpRulesState {
  rules: LoadedSbpRules;
  /** True until every rules doc has reported (present or absent). */
  loading: boolean;
  error: string | null;
}

export function useSbpRules(enabled: boolean): SbpRulesState {
  const [rules, setRules] = useState<LoadedSbpRules>(EMPTY_SBP_RULES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let reports = 0;
    const unsub = subscribeToAllSbpRules(
      (next) => {
        setRules(next);
        reports += 1;
        if (reports >= Object.keys(EMPTY_SBP_RULES).length) setLoading(false);
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

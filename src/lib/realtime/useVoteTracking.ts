/**
 * useVoteTracking — Subscribe to `votes/current-vote` and derive totals.
 *
 * Wraps the `onSnapshot('votes/current-vote')` pattern duplicated across
 * EncounterVote, MonsterVote, DecoderRingVote, ShipCombatVote. Each of
 * those components will eventually migrate (Phase 3 collapses them into
 * one component); this hook is the bridge.
 *
 * Returns counts as an object plus a derived total. Does NOT include
 * cast/submit logic — that stays in the consumer (it's tightly coupled
 * to UI: particles, audio, localStorage tracking).
 */

import { useMemo } from 'react';
import { useFirebaseDoc } from './useFirebaseDoc';

interface VoteDoc {
  counts?: Record<string, number>;
  totalVotes?: number;
}

export interface VoteTrackingResult {
  counts: Record<string, number>;
  totalVotes: number;
  isLoading: boolean;
  /** Percentage of `optionId` over total. Returns 0 when no votes cast. */
  percentOf: (optionId: string) => number;
}

export function useVoteTracking(): VoteTrackingResult {
  const { data, isLoading } = useFirebaseDoc<VoteDoc>('votes', 'current-vote');

  return useMemo(() => {
    const counts = data?.counts ?? {};
    const totalVotes =
      data?.totalVotes ??
      Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

    const percentOf = (optionId: string): number => {
      if (totalVotes <= 0) return 0;
      return ((counts[optionId] || 0) / totalVotes) * 100;
    };

    return { counts, totalVotes, isLoading, percentOf };
  }, [data, isLoading]);
}

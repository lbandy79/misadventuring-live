import { useEffect, useState } from 'react';
import type { MonsterBuilderConfig } from '@mtp/data/liveMonster';
import {
  subscribeToMonsterSession,
  subscribeToSlotVotes,
  type MonsterSession,
  type MonsterSlotVote,
} from '@mtp/lib/liveMonster/liveMonsterApi';

/** Live session + every slot's votes for the spotlight. */
export function useWriteInFeed(showId: string, config: MonsterBuilderConfig) {
  const [session, setSession] = useState<MonsterSession | null>(null);
  const [votesBySlot, setVotesBySlot] = useState<Record<string, MonsterSlotVote[]>>({});

  useEffect(() => subscribeToMonsterSession(showId, setSession), [showId]);

  useEffect(() => {
    setVotesBySlot({});
    const unsubs = config.slots.map((slot) =>
      subscribeToSlotVotes(showId, slot.id, (votes) => {
        setVotesBySlot((prev) => ({ ...prev, [slot.id]: votes }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [showId, config]);

  // Every slot has reported at least once — safe to treat what we have as "already here".
  const loaded = config.slots.every((s) => votesBySlot[s.id] !== undefined);

  return { session, votesBySlot, loaded };
}

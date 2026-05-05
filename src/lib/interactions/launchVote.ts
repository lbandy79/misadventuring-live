/**
 * launchVote — centralized writer for the simple counts-based vote pattern.
 *
 * Phase 3c: pulled out of AdminPanel.activateVoting() so the same writer
 * can be reused by the eventual unified-platform admin and so showId
 * stamping happens in exactly one place.
 *
 * Writes:
 *   config/active-interaction  → { type: 'vote', showId, question, options, ... }
 *   votes/current-vote         → { counts: { [optionId]: 0 }, totalVotes: 0, showId, sessionId }
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { VoteOption } from '../types/interaction.types';

export interface LaunchVoteInput {
  question: string;
  options: VoteOption[];
  timer: number;
  showId: string;
}

export interface LaunchedVote {
  sessionId: string;
}

/** Generate a session id unique to this voting round. */
function makeVoteSessionId(): string {
  return `vote-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function launchVote(input: LaunchVoteInput): Promise<LaunchedVote> {
  const sessionId = makeVoteSessionId();

  await setDoc(doc(db, 'config', 'active-interaction'), {
    type: 'vote',
    showId: input.showId,
    question: input.question,
    options: input.options,
    isOpen: true,
    timer: input.timer,
    startedAt: Date.now(),
    sessionId,
  });

  const initialCounts: Record<string, number> = {};
  input.options.forEach((opt) => {
    initialCounts[opt.id] = 0;
  });

  await setDoc(doc(db, 'votes', 'current-vote'), {
    counts: initialCounts,
    totalVotes: 0,
    showId: input.showId,
    sessionId,
  });

  return { sessionId };
}

/** Reset votes for the active interaction without changing the question/options. */
export async function resetVoteCounts(input: {
  showId: string;
  options: VoteOption[];
  /** Active interaction snapshot, so we preserve unrelated fields. */
  activeInteraction: Record<string, unknown>;
}): Promise<LaunchedVote> {
  const sessionId = makeVoteSessionId();

  const initialCounts: Record<string, number> = {};
  input.options.forEach((opt) => {
    initialCounts[opt.id] = 0;
  });

  await setDoc(doc(db, 'config', 'active-interaction'), {
    ...input.activeInteraction,
    showId: input.showId,
    sessionId,
    startedAt: Date.now(),
  });

  await setDoc(doc(db, 'votes', 'current-vote'), {
    counts: initialCounts,
    totalVotes: 0,
    showId: input.showId,
    sessionId,
  });

  return { sessionId };
}

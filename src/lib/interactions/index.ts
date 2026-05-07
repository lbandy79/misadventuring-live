/**
 * `src/lib/interactions` — Centralized writers for live interactions.
 *
 * Phase 3c: covers the simple counts-based vote pattern only. The
 * show-specific interactions (monster-builder, decoder-ring, ship-combat)
 * each have their own bespoke flows that are not yet abstracted.
 */

export {
  launchVote,
  resetVoteCounts,
  type LaunchVoteInput,
  type LaunchedVote,
} from './launchVote';

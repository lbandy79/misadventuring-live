/**
 * `src/lib/realtime` — Firebase listener hooks.
 *
 * Phase 2b additions. Use these instead of inlining `onSnapshot` calls.
 * Each hook is thin and composable; behavior matches the original
 * patterns it replaces.
 */

export { useFirebaseDoc } from './useFirebaseDoc';
export type { FirebaseDocResult } from './useFirebaseDoc';
export { useInteractionState } from './useInteractionState';
export { useVoteTracking } from './useVoteTracking';
export type { VoteTrackingResult } from './useVoteTracking';

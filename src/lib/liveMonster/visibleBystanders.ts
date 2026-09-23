/**
 * Which bystander submissions are safe to publish.
 *
 * Deliberately dependency-free (type-only imports, which erase at compile
 * time) so it can be unit-tested without standing up Firebase.
 */

import type { MonsterSession } from './liveMonsterApi';
import type { BystanderSubmission } from './bystanderSubmissionsApi';

/**
 * The bystanders a public surface is allowed to show: only the ones the GM
 * actually put on the projector during the show.
 *
 * `session.bystanderStates` is the GM's own curation — 'featured' for the
 * living row, 'dead' for the graveyard row, key absent for never shown. Both
 * visible states count; absence does not.
 *
 * This exists because audience submissions are free text on an unauthenticated
 * form. The input profanity filter is evadable — `bad-words` matches whole
 * tokens, so "mega cum" is caught but "Megacum" is not — and in Sept 2026 one
 * got through. It was spotted on the night and never featured, but the recap
 * published all 21 submissions regardless, ignoring that curation entirely.
 *
 * Publishing is now opt-in: what the GM chose to put on stage is what gets
 * published. Fails closed on purpose — no session, no states map, or an empty
 * one yields an empty list, so a show where nobody was featured publishes
 * nothing rather than publishing everything.
 */
export function visibleBystanders(
  bystanders: BystanderSubmission[],
  session: MonsterSession | null | undefined,
): BystanderSubmission[] {
  const states = session?.bystanderStates;
  if (!states) return [];
  return bystanders.filter((b) => states[b.id] != null);
}

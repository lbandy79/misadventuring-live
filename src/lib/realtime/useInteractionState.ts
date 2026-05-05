/**
 * useInteractionState — Subscribe to `config/active-interaction`.
 *
 * Single source of truth for "what's happening right now" across all
 * connected clients (display, audience, admin). Currently re-implemented
 * inline in many components; this hook centralizes the contract.
 *
 * Phase 2b — additive. Existing inline subscriptions keep working; new
 * code (and migrations in Phase 3) should use this hook.
 */

import { useFirebaseDoc } from './useFirebaseDoc';
import type { ActiveInteraction } from '../types/interaction.types';

export function useInteractionState() {
  return useFirebaseDoc<ActiveInteraction>('config', 'active-interaction');
}

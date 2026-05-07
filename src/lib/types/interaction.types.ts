/**
 * Interaction Types — Live Show State Machine
 *
 * The `ActiveInteraction` document at `config/active-interaction` drives every
 * connected client (display, audience, admin). `InteractionType` is the
 * canonical union for the `type` discriminator.
 *
 * NOTE (Phase 2a): This file introduces the canonical type. Several components
 * still re-declare the same union inline (e.g. AudienceView, DisplayView).
 * Phase 3 will migrate them to import from here.
 */

export type InteractionType =
  | 'none'
  | 'vote'
  | 'madlibs'
  | 'npc-naming'
  | 'group-roll'
  | 'monster-vote'
  | 'villager-submit'
  | 'monster-builder'
  | 'decoder-ring'
  | 'ship-combat';

export interface VoteOption {
  id: string;
  label: string;
  emoji?: string;
}

/**
 * Shape of `config/active-interaction` Firestore doc.
 * Most fields are optional because each interaction type uses a subset.
 */
export interface ActiveInteraction {
  type: InteractionType;
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  sessionId?: string;
  status?: string;
  /** Monster-builder sequential mode */
  currentPart?: 'head' | 'torso' | 'arms' | 'legs';
  partIndex?: 0 | 1 | 2 | 3;
  /** Phase 3 will add `showId` here once Show config is wired in. */
  showId?: string;
}

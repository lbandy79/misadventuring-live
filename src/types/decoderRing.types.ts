/**
 * Decoder Ring Types — Well of Lines / IP Isle
 *
 * Firebase state + interaction types for the decoder ring feature.
 * Pattern: mirrors monsterBuilder.types.ts exactly so all existing
 * infrastructure (admin listeners, audience session tracking, display
 * animations) works with minimal wiring.
 *
 * FLOW:
 *   1. GM opens decoder ring → status: 'voting-year'
 *   2. Audience votes on 3–4 pre-selected years → year wins
 *   3. GM reveals character → status: 'revealing-character'
 *   4. If multiple chars for that year, GM picks or audience votes
 *   5. GM opens ship role vote → status: 'voting-role'
 *   6. Audience votes on 5–6 ship roles → role wins
 *   7. GM reveals role assignment → status: 'complete'
 *   8. Repeat for next spin (up to 5 total)
 */

import type { ShipRole, FlickerRating } from '../data/decoderRingCharacters';

// ─── Firebase document: decoder-ring/current ───────────────────────────

export type DecoderRingStatus =
  | 'idle'
  | 'voting-year'         // Audience choosing a year
  | 'voting-character'    // Audience choosing between multiple characters at winning year
  | 'revealing-character' // Character card reveal on display
  | 'voting-role'         // Audience choosing ship role
  | 'revealing-role'      // Ship role result reveal
  | 'complete';           // This spin is done

export interface DecoderRingYearOption {
  year: number;
  /** Character IDs available at this year (pre-selected by GM) */
  characterIds: string[];
  /** Thumbnail image filename for phone display */
  thumbnail: string;
  /** Short label for the vote button, e.g. "1989 — TMNT" */
  label: string;
}

export interface DecoderRingState {
  status: DecoderRingStatus;

  /** Current spin number (1-based, up to 5) */
  spinNumber: number;

  /** Year voting round */
  yearOptions: DecoderRingYearOption[];
  yearVotes: Record<number, number>;       // { 1989: 12, 1985: 8, ... }
  winningYear: number | null;

  /** Character reveal */
  revealedCharacterId: string | null;

  /** Character voting (when multiple chars at winning year) */
  characterVotes: Record<string, number>;  // { "shell": 5, "cowl": 3, ... }

  /** Ship role voting round */
  roleVotes: Record<ShipRole, number>;     // { helmsman: 5, gunner: 8, ... }
  winningRole: ShipRole | null;

  /** Recruited crew so far (persists across spins) */
  crew: RecruitedCrewMember[];

  /** Session tracking */
  sessionId: string;
  startedAt: number;
}

export interface RecruitedCrewMember {
  characterId: string;
  characterName: string;
  role: ShipRole;
  year: number;
  image: string;
  flicker: FlickerRating;
  recruitedAt: number;
}

// ─── Active interaction type (goes in config/active-interaction) ───────

export interface DecoderRingInteraction {
  type: 'decoder-ring';
  status: DecoderRingStatus;
  sessionId: string;
  spinNumber: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────

/** Generate a fresh decoder ring state */
export function createInitialDecoderRingState(sessionId: string): DecoderRingState {
  return {
    status: 'idle',
    spinNumber: 1,
    yearOptions: [],
    yearVotes: {},
    winningYear: null,
    revealedCharacterId: null,
    characterVotes: {},
    roleVotes: {
      helmsman: 0,
      engineer: 0,
      gunner: 0,
      lookout: 0,
      cook: 0,
      diplomat: 0,
    },
    winningRole: null,
    crew: [],
    sessionId,
    startedAt: Date.now(),
  };
}

/** Calculate the winning year from votes */
export function calculateWinningYear(votes: Record<number, number>): number | null {
  const entries = Object.entries(votes).map(([y, c]) => [Number(y), c] as [number, number]);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  const winners = entries.filter(([, c]) => c === max);
  // Tie-break: random
  return winners[Math.floor(Math.random() * winners.length)][0];
}

/** Calculate the winning role from votes */
export function calculateWinningRole(votes: Record<ShipRole, number>): ShipRole | null {
  const entries = Object.entries(votes) as [ShipRole, number][];
  const nonZero = entries.filter(([, c]) => c > 0);
  if (nonZero.length === 0) return null;
  const max = Math.max(...nonZero.map(([, c]) => c));
  const winners = nonZero.filter(([, c]) => c === max);
  return winners[Math.floor(Math.random() * winners.length)][0];
}

/** Storage key for audience "already voted this round" tracking */
export function getYearVoteStorageKey(sessionId: string, spin: number): string {
  return `decoder-year-${sessionId}-${spin}`;
}

export function getRoleVoteStorageKey(sessionId: string, spin: number): string {
  return `decoder-role-${sessionId}-${spin}`;
}

export function getCharVoteStorageKey(sessionId: string, spin: number): string {
  return `decoder-char-${sessionId}-${spin}`;
}

/** Calculate the winning character from votes */
export function calculateWinningCharacter(votes: Record<string, number>): string | null {
  const entries = Object.entries(votes);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  if (max === 0) return null;
  const winners = entries.filter(([, c]) => c === max);
  return winners[Math.floor(Math.random() * winners.length)][0];
}



/**
 * Show — Platform-Level Definition
 *
 * Distinct from `ShowConfig` in `system.types.ts` (which is per-system metadata
 * embedded inside a TTRPG system JSON). A `Show` is the unified-platform
 * concept: it picks a theme + system and enables a subset of interactions.
 *
 * Phase 2a: type only.
 * Phase 3: real `shows/{slug}.config.ts` files + `ShowProvider` context.
 */

import type { ThemeId } from '../../themes/theme.types';
import type { InteractionType } from './interaction.types';

export interface Show {
  /** kebab-case slug, used in URLs and Firestore `showId` field */
  id: string;

  /** Display name (e.g. "The Beast of Ridgefall") */
  name: string;

  /** Optional series/season grouping (e.g. "The Betawave Tapes") */
  seriesName?: string;

  /** Theme registry id */
  themeId: ThemeId;

  /** TTRPG system JSON id (e.g. "kids-on-bikes-2e") */
  systemId: string;

  /** Which interaction features are enabled for this show */
  enabledInteractions: InteractionType[];

  /** Per-show data extensions (decoder characters, ship combat waves, etc.).
   *  Phase 3 will replace this with strongly-typed slots. */
  data?: Record<string, unknown>;

  /** Display-only metadata for marketing / hub pages */
  description?: string;
  heroImage?: string;
  status?: 'draft' | 'live' | 'archived';

  /**
   * Public lifecycle stage for marketing surfaces. Independent of `status`:
   *   - 'live'     — currently airing / playable.
   *   - 'upcoming' — scheduled future show; takes reservations.
   *   - 'past'     — has aired; surfaces as "Watch the recap".
   *   - 'shelved'  — on hiatus / not currently public; hidden from listings.
   * When omitted, callers fall back to `status` (back-compat for older entries).
   */
  era?: 'live' | 'upcoming' | 'past' | 'shelved';

  /** ISO date (YYYY-MM-DD) for upcoming/past shows. Used in marketing copy. */
  nextDate?: string;

  /**
   * Public recap target. Presence implies the show has aired and the audience
   * can revisit it. `firestore` points at an episode doc keyed in
   * `recapConfigs`; `external` points at e.g. a YouTube link.
   */
  recap?:
    | { kind: 'firestore'; recapId: string }
    | { kind: 'external'; url: string; label?: string };

  /** Optional secondary YouTube link shown alongside a Firestore recap. */
  youtubeUrl?: string;
}

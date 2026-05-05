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
}

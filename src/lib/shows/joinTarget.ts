/**
 * Where the permanent show QR (`/join`) sends a phone.
 *
 * `config/platform.currentShowId` holds either a registry show id
 * (`green-oaks`) or a dated Firestore episode id (`monster-of-the-week-2026-10-24`,
 * `greenoaks-2026-11-28`). Episode ids aren't in the show registry, so the
 * caller supplies the two lookups that can recognise them.
 *
 * Pure so it can be tested without Firebase or the system JSON imports.
 */

import type { Show } from '../types/show.types';

export interface JoinLookups {
  /** Registered shows (the registry's `shows`). */
  shows: Show[];
  /** True when a live-monster config exists for this episode id. */
  hasMonsterConfig: (episodeId: string) => boolean;
  /** Firestore episode id → registry show id, from each npc-creation
   *  show's `showConfig.showId` in its system JSON. */
  npcEpisodes: Record<string, string>;
}

export const LIVE_MONSTER_PATH = '/live-monster';
/** No phone experience is running — the landing page pitches the next show. */
export const JOIN_FALLBACK_PATH = '/';

export function resolveJoinTarget(currentShowId: string | undefined, lookups: JoinLookups): string {
  if (!currentShowId) return JOIN_FALLBACK_PATH;

  const direct = lookups.shows.find((s) => s.id === currentShowId);
  if (direct) return pathForShow(direct);

  if (lookups.hasMonsterConfig(currentShowId)) return LIVE_MONSTER_PATH;

  const npcShowId = lookups.npcEpisodes[currentShowId];
  if (npcShowId) return `/shows/${npcShowId}/join`;

  return JOIN_FALLBACK_PATH;
}

function pathForShow(show: Show): string {
  switch (show.audienceMode) {
    case 'monster-builder':
      return LIVE_MONSTER_PATH;
    case 'npc-creation':
      return `/shows/${show.id}/join`;
    default:
      return JOIN_FALLBACK_PATH;
  }
}

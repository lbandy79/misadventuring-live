/**
 * Show Registry
 *
 * Static registry of all shows known to the platform. Used by:
 *   - ShowProvider (resolves a `showId` to a Show definition)
 *   - Marketing / hub pages (lists shows)
 *   - Admin (validates `currentShowId` writes)
 *
 * Adding a new show: create a `<slug>.show.ts` file alongside this one
 * and append it to `shows` below.
 */

import type { Show } from '../types/show.types';
import { beastOfRidgefallShow } from './beast-of-ridgefall.show';
import { betawaveTapesShow } from './betawave-tapes.show';
import { madLibsHoneyHeistShow } from './mad-libs-honey-heist.show';
import { mysteryOfIpIsleShow } from './mystery-of-ip-isle.show';
import { soggyBottomPiratesShow } from './soggy-bottom-pirates.show';

export const shows: Show[] = [
  madLibsHoneyHeistShow,
  betawaveTapesShow,
  mysteryOfIpIsleShow,
  beastOfRidgefallShow,
  soggyBottomPiratesShow,
];

export const showRegistry: Record<string, Show> = Object.fromEntries(
  shows.map((s) => [s.id, s])
);

/** Lookup a show by id, returning undefined if it isn't registered. */
export function getShow(showId: string): Show | undefined {
  return showRegistry[showId];
}

/** Lookup a show by id; throws if missing. Use when absence is a bug. */
export function requireShow(showId: string): Show {
  const show = showRegistry[showId];
  if (!show) {
    throw new Error(
      `Unknown showId "${showId}". Registered: ${Object.keys(showRegistry).join(', ')}`
    );
  }
  return show;
}

/**
 * Resolve a show's public lifecycle stage. Prefers the explicit `era`
 * field; falls back to legacy `status` semantics for entries that haven't
 * been migrated yet.
 */
export function getShowEra(show: Show): 'live' | 'upcoming' | 'past' | 'shelved' {
  if (show.era) return show.era;
  if (show.status === 'archived') return 'past';
  if (show.status === 'draft') return 'upcoming';
  return 'live';
}

/** Shows visible on public listings (excludes shelved). */
export function getPublicShows(): Show[] {
  return shows.filter((s) => getShowEra(s) !== 'shelved');
}

/** Shows that are upcoming or live — eligible for reservations. */
export function getReservableShows(): Show[] {
  return shows.filter((s) => {
    const era = getShowEra(s);
    return era === 'upcoming' || era === 'live';
  });
}

/** Past shows with a recap surface. */
export function getPastShows(): Show[] {
  return shows.filter((s) => getShowEra(s) === 'past');
}

/** Default show used when no `showId` is set in Firestore. */
export const defaultShowId = 'beast-of-ridgefall';

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
import { soggyBottomPiratesShow } from './soggy-bottom-pirates.show';
import { neonNightmaresShow } from './neon-nightmares.show';

export const shows: Show[] = [
  beastOfRidgefallShow,
  betawaveTapesShow,
  soggyBottomPiratesShow,
  neonNightmaresShow,
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

/** Default show used when no `showId` is set in Firestore. */
export const defaultShowId = 'beast-of-ridgefall';

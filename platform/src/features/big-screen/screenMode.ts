/**
 * What the projector shows, and when it's about to get crowded. Pure, no
 * Firebase: the projector, the GM panel and the phone view all use this so
 * they always agree.
 *
 * The mode is stored in two existing docs (no new collection, no rules
 * change):
 *   rumor-mill/{showId}.boardOn           → rumors on screen
 *   world-selections/{showId}.displayMode → 'cast' = townies on screen
 */

export type ScreenMode = 'off' | 'townies' | 'rumors' | 'both';

export const SCREEN_MODES: Array<{ id: ScreenMode; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'townies', label: 'Townies' },
  { id: 'rumors', label: 'Rumors' },
  { id: 'both', label: 'Both' },
];

export function screenModeFrom(boardOn: boolean, townieDisplayMode: string | undefined): ScreenMode {
  const townies = townieDisplayMode === 'cast';
  if (boardOn && townies) return 'both';
  if (boardOn) return 'rumors';
  if (townies) return 'townies';
  return 'off';
}

/** The two writes that put a mode on screen. */
export function writesForMode(mode: ScreenMode): { boardOn: boolean; displayMode: 'cast' | 'hidden' } {
  return {
    boardOn: mode === 'rumors' || mode === 'both',
    displayMode: mode === 'townies' || mode === 'both' ? 'cast' : 'hidden',
  };
}

/**
 * How many townies fit before the layout squishes, measured at 1920×1080
 * with ?demo=townies / ?demo=both (Nov 2026). Rumors never crowd: they
 * turn pages.
 *   townies: two rows of six; a 13th starts a third row and cards shrink
 *   both:    the left-hand column; at 10 rows the "they …" line is cut off
 */
export const TOWNIE_FIT: Record<'townies' | 'both', number> = {
  townies: 12,
  both: 9,
};

/** Rumor notes per page on the combined screen (full board uses its config). */
export const BOTH_RUMORS_PER_PAGE = 6;

export interface Crowding {
  level: 'ok' | 'full' | 'over';
  /** Plain-English line for the GM panel; empty when level is 'ok'. */
  message: string;
}

const MODE_NAME: Record<'townies' | 'both', string> = { townies: 'Townies', both: 'Both' };

/**
 * Warn the GM before marked townies outgrow the screen. For a mode that
 * shows no townies (Off, Rumors) the check is against Both, the tightest
 * layout they might switch to.
 */
export function townieCrowding(mode: ScreenMode, marked: number): Crowding {
  const against: 'townies' | 'both' = mode === 'townies' ? 'townies' : 'both';
  const fit = TOWNIE_FIT[against];
  const name = MODE_NAME[against];
  const onScreenNow = mode === 'townies' || mode === 'both';

  if (marked > fit) {
    const extra = marked - fit;
    const fix =
      against === 'both'
        ? `Unmark ${extra}, or switch the screen to Townies only (fits ${TOWNIE_FIT.townies}).`
        : `Unmark ${extra}.`;
    return {
      level: 'over',
      message: onScreenNow
        ? `${marked} townies marked, but ${name} fits ${fit}. The screen is squished now. ${fix}`
        : `${marked} townies marked, but ${name} fits ${fit}. ${fix}`,
    };
  }
  if (marked === fit && onScreenNow) {
    return {
      level: 'full',
      message: `${fit} of ${fit} townies marked: ${name} is full. One more will squish.`,
    };
  }
  return { level: 'ok', message: '' };
}

/**
 * Seasonal themes — one switch.
 *
 * A season is a set of CSS custom-property values under
 * `[data-season="<id>"]` (see halloween.css). Pages opt in by putting
 * `data-season` on their own root — currently only the GM spotlight and
 * the projector display. The audience phone page never does.
 *
 * To add a season: write `<id>.css` overriding the --season-* and --lmd-*
 * tokens, import it in useSeason.ts, add the id below, and run
 * `npm run check:contrast`.
 *
 * Kill switch on any page: `?season=none`. Force one: `?season=halloween`.
 */

export const SEASONS = ['halloween'] as const;
export type SeasonId = (typeof SEASONS)[number];

/** The season shown by default. Set to null to turn seasonal theming off. */
export const ACTIVE_SEASON: SeasonId | null = 'halloween';

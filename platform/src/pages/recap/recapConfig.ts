/**
 * Per-show metadata for the public recap page.
 *
 * The episode `showId` (e.g. `betawave-last-call-2026-04-18`) is what
 * Firestore docs are stamped with. The series-level Show registry doesn't
 * cover episodes, so this map fills the gap with hand-curated facts:
 * date, venue, the chapter number, the featured character pick, and the
 * "coming next" tape-card. New recap pages opt in by adding an entry.
 */

export type RecapCostume = 'betawave-vhs' | 'paper-base';

export interface ComingNext {
  /** ISO date string (YYYY-MM-DD). Optional — falls back to "TBA". */
  date?: string;
  venue?: string;
  /** Display name of the system, or undefined for "system reveal coming." */
  systemName?: string;
  rsvpHref?: string;
  ctaLabel?: string;
  blurb?: string;
}

export interface RecapClip {
  label: string;
  youtubeId: string;
}

export interface RecapConfig {
  showId: string;
  seriesName: string;
  episodeTitle: string;
  chapter: string;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  venue: string;
  systemName: string;
  costume: RecapCostume;
  /** One-paragraph summary in TMP brand voice. */
  summary?: string;
  /** YouTube ID for the full episode. */
  fullEpisodeYoutubeId?: string;
  /** Short highlight clips to embed on the recap page. */
  clips?: RecapClip[];
  /** NPC document IDs to surface as show highlights. */
  npcHighlights?: string[];
  /** Beat document IDs to surface as Stinger highlights. */
  stingerHighlights?: string[];
  /** Reservation id of the NPC to feature at the top of the section. */
  featuredReservationId?: string;
  /** Whether the monster reveal is recoverable from data. `lost` → mythology sticky note. */
  monsterStatus: 'lost' | 'available';
  next?: ComingNext;
}

/**
 * POST-SHOW CHECKLIST — do this after every show:
 *
 * 1. Add an entry here keyed by the Firestore episode showId.
 *    - monsterStatus: 'available' for MotW (fetches live monster + bystanders automatically)
 *    - monsterStatus: 'lost' if the builder wasn't run or data is gone
 *    - fullEpisodeYoutubeId: add once the recording is up
 *    - next: point at the upcoming show
 *
 * 2. Flip the previous show's `era` to 'past' in src/lib/shows/<series>.show.ts
 *    and update `nextDate` to the new show's date.
 *
 * 3. Update LATEST_RECAP + NEXT_SHOW in platform/src/pages/LandingPage.tsx.
 *
 * 4. Set Firestore config/platform.currentShowId to the new episode showId on show day.
 *    For MotW: also ensure a new episode config exists in src/data/liveMonster/
 *    and is registered in src/data/liveMonster/index.ts.
 */
export const recapConfigs: Record<string, RecapConfig> = {
  'monster-of-the-week-2026-06-27': {
    showId: 'monster-of-the-week-2026-06-27',
    seriesName: 'Monster of the Week',
    episodeTitle: 'Episode One',
    chapter: 'Episode One',
    date: '2026-06-27',
    venue: 'Lucky Straws, Winter Garden, FL',
    systemName: 'Monster of the Week',
    costume: 'paper-base',
    fullEpisodeYoutubeId: '7T4dgK0Xg2w?start=156',
    monsterStatus: 'lost',
    next: {
      date: '2026-07-25',
      venue: 'Lucky Straws, Winter Garden, FL',
      systemName: 'Monster of the Week',
      rsvpHref: '/shows/monster-of-the-week',
      ctaLabel: 'The story continues →',
      blurb: 'The case isn\'t closed. Come back July 25 to see where it goes.',
    },
  },
  'honey-heist-madlibs-2026-05-23': {
    showId: 'honey-heist-madlibs-2026-05-23',
    seriesName: 'Mad Libs Honey Heist',
    episodeTitle: 'Mad Libs Honey Heist',
    chapter: 'One-Shot',
    date: '2026-05-31',
    venue: 'Lucky Straws, Winter Garden, FL',
    systemName: 'Honey Heist',
    costume: 'paper-base',
    fullEpisodeYoutubeId: '7qH6W5Nfy6Q',
    monsterStatus: 'available',
    next: {
      date: '2026-07-25',
      venue: 'Lucky Straws, Winter Garden, FL',
      systemName: 'Monster of the Week',
      rsvpHref: '/shows/monster-of-the-week',
      ctaLabel: 'See what\'s coming →',
    },
  },
  'betawave-last-call-2026-04-18': {
    showId: 'betawave-last-call-2026-04-18',
    seriesName: 'The Betawave Tapes',
    episodeTitle: 'Last Call',
    chapter: 'Chapter Four',
    date: '2026-04-18',
    venue: 'Lucky Straws, Winter Garden, FL',
    systemName: 'Kids on Bikes 2E',
    costume: 'betawave-vhs',
    fullEpisodeYoutubeId: 'G0Hbj8YJrr8?start=3559',
    // Banana Wamama Bamama 🍌🍌🍌 — got the 15-minute spotlight at the show.
    featuredReservationId: 'NgC92SQZfJdwIuiLmNFf',
    monsterStatus: 'lost',
    next: {
      date: '2026-05-23',
      venue: 'Lucky Straws, Winter Garden, FL',
      // System is being decided between Honey Heist and Lasers & Feelings.
      systemName: undefined,
      rsvpHref: '/shows/mad-libs-honey-heist/join',
      blurb:
        'Mad Libs format. The audience writes the prompts. The cast plays it live.',
    },
  },
};

export function getRecapConfig(showId: string): RecapConfig | undefined {
  return recapConfigs[showId];
}

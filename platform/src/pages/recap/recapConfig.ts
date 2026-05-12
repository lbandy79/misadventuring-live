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

export const recapConfigs: Record<string, RecapConfig> = {
  'betawave-last-call-2026-04-18': {
    showId: 'betawave-last-call-2026-04-18',
    seriesName: 'The Betawave Tapes',
    episodeTitle: 'Last Call',
    chapter: 'Chapter Four',
    date: '2026-04-18',
    venue: 'Lucky Straws, Winter Garden, FL',
    systemName: 'Kids on Bikes 2E',
    costume: 'betawave-vhs',
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

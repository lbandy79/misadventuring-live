/**
 * Monster of the Week — Episode Four.
 *
 * October 24, 2026 at Lucky Straws, Winter Garden, FL. The Halloween show.
 * The audience wrote in every winning trait again: Jumpin' Jehova the Amish
 * Luchador, who hides in a mattress store that is totally not laundering
 * money and suplexes anyone with technology that's too advanced. (The
 * weakness slot is `secret`, so keep it out of public copy.)
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekEp4Show: Show = {
  id: 'monster-of-the-week-ep4',
  name: 'Monster of the Week — Episode Four',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'Halloween night. The audience skipped every preset again and built an Amish luchador who lives in a suspicious mattress store and suplexes anyone with a smartphone.',
  era: 'past',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
  recap: { kind: 'firestore', recapId: 'monster-of-the-week-2026-10-24' },
  youtubeUrl: 'https://www.youtube.com/watch?v=qQd9iDZdzwo',
};
